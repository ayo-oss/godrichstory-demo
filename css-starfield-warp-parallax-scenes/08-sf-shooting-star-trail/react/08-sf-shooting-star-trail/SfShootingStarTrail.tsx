import { useEffect, useRef } from "react";
import styles from "./SfShootingStarTrail.module.scss";

const W = 480;
const H = 300;
const PI2 = Math.PI * 2;
const FIXED_DT = 16;
const REDUCE_STEP_MS = 900;
const KEY_STEP = 14;
const IDLE_TICKS = 150;
const BTN_PAUSE = '멈춤';
const BTN_PLAY = '재생';
const BTN_NEXT = '다음 장면';

type RGB = [number, number, number];
interface Input { x: number; y: number; idle: number; }
interface Scene {
    step(): void;
    draw(ctx: CanvasRenderingContext2D): void;
    label(): string;
    tap(): void;
}
type Maker = (inp: Input, reduce: boolean) => Scene;

const BG: RGB = [14, 12, 32];
const STAR_RGBS: RGB[] = [[226, 238, 255], [255, 222, 196], [208, 196, 255], [196, 240, 228], [255, 206, 226]];

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
function rgba(c: RGB, a: number): string {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
}
function mix(a: RGB, b: RGB, k: number): RGB {
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}
// 시드 고정 난수 — 같은 시드면 언제나 같은 수열 (선형 합동 방식)
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return function (): number {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function paintBg(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.fillStyle = rgba(BG, alpha);
    ctx.fillRect(0, 0, W, H);
}

function start(root: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLButtonElement, make: Maker): () => void {
    const ctx0 = canvas.getContext('2d');
    if (!ctx0) {
        return function (): void { return; };
    }
    const ctx: CanvasRenderingContext2D = ctx0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inp: Input = { x: W / 2, y: H / 2, idle: 99999 };
    const scene = make(inp, reduce);
    let paused = false;
    let rafId = 0;
    let lastTs = -1;
    let accMs = 0;
    let lastLabel = '';
    const cleaners: Array<() => void> = [];
    function listen(target: EventTarget, type: string, fn: (e: Event) => void): void {
        target.addEventListener(type, fn);
        cleaners.push(function (): void { target.removeEventListener(type, fn); });
    }
    function show(): void {
        scene.draw(ctx);
        const t = scene.label();
        if (t !== lastLabel) {
            lastLabel = t;
            statusEl.textContent = t;
        }
    }
    function advance(ms: number): void {
        const n = Math.round(ms / FIXED_DT);
        for (let i = 0; i < n; i += 1) {
            inp.idle += 1;
            scene.step();
        }
    }
    function refresh(): void {
        if (reduce) {
            advance(FIXED_DT * 6);
            show();
        }
    }
    function toLocal(e: PointerEvent): void {
        const r = canvas.getBoundingClientRect();
        inp.x = clamp((e.clientX - r.left) * W / r.width, 0, W);
        inp.y = clamp((e.clientY - r.top) * H / r.height, 0, H);
        inp.idle = 0;
    }
    function tick(ts: number): void {
        if (lastTs < 0) {
            lastTs = ts;
        }
        const frameDt = Math.min(ts - lastTs, 160);
        lastTs = ts;
        if (!paused) {
            accMs += frameDt;
            while (accMs >= FIXED_DT) {
                inp.idle += 1;
                scene.step();
                accMs -= FIXED_DT;
            }
            show();
        }
        rafId = requestAnimationFrame(tick);
    }
    btnEl.textContent = reduce ? BTN_NEXT : BTN_PAUSE;
    if (reduce) {
        root.classList.remove('is-demo');
        advance(1400);
        show();
    }
    listen(btnEl, 'click', function (): void {
        if (reduce) {
            advance(REDUCE_STEP_MS);
            show();
            return;
        }
        paused = !paused;
        if (paused) {
            root.classList.remove('is-demo');
        } else {
            root.classList.add('is-demo');
        }
        btnEl.textContent = paused ? BTN_PLAY : BTN_PAUSE;
    });
    listen(canvas, 'pointermove', function (e: Event): void {
        toLocal(e as PointerEvent);
        refresh();
    });
    listen(canvas, 'pointerdown', function (e: Event): void {
        toLocal(e as PointerEvent);
        scene.tap();
        refresh();
    });
    listen(canvas, 'keydown', function (e: Event): void {
        const k = (e as KeyboardEvent).key;
        let dx = 0;
        let dy = 0;
        if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            scene.tap();
            refresh();
            return;
        }
        if (k === 'ArrowLeft') { dx = -KEY_STEP; }
        else if (k === 'ArrowRight') { dx = KEY_STEP; }
        else if (k === 'ArrowUp') { dy = -KEY_STEP; }
        else if (k === 'ArrowDown') { dy = KEY_STEP; }
        else { return; }
        e.preventDefault();
        inp.x = clamp(inp.x + dx, 0, W);
        inp.y = clamp(inp.y + dy, 0, H);
        inp.idle = 0;
        refresh();
    });
    if (!reduce) {
        rafId = requestAnimationFrame(tick);
    }
    return function (): void {
        cancelAnimationFrame(rafId);
        for (let i = 0; i < cleaners.length; i += 1) {
            cleaners[i]();
        }
    };
}

const TRAIL_LEN = 44;
const METEOR_RATE = 16;
const ANGLE = 0.62;
const GRAVITY = 0.06;
const METEOR_SPEED = 6.5;
const FADE = 0.2;
const BG_STARS = 140;
const HEAD: RGB = [255, 244, 232];
const TAIL: RGB = [190, 170, 255];
const TXT_FLOW = '별똥별 — 꼬리는 나이만큼 옅어진다';
const TXT_OWN = '내가 쏜 별똥별 — 중력이 꼬리를 휜다';

interface Meteor { x: number; y: number; vx: number; vy: number; hist: number[]; live: boolean; }
interface Dim { x: number; y: number; r: number; p: number; }

function makeScene(inp: Input, reduce: boolean): Scene {
    const rnd = lcg(450808);
    const dims: Dim[] = [];
    for (let i = 0; i < BG_STARS; i += 1) {
        dims.push({ x: rnd() * W, y: rnd() * H, r: 0.5 + 1.1 * rnd(), p: rnd() * PI2 });
    }
    const meteors: Meteor[] = [];
    let t = 0;
    let ownLeft = 0;
    let primed = false;
    function launch(x: number, y: number): void {
        const ang = ANGLE + (rnd() - 0.5) * 0.3;
        const sp = METEOR_SPEED * (0.8 + 0.5 * rnd());
        meteors.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, hist: [], live: true });
    }
    const scene: Scene = {
        step(): void {
            t += 1;
            if (ownLeft > 0) {
                ownLeft -= 1;
            }
            if (t % METEOR_RATE === 1) {
                launch(-30 + rnd() * W * 0.9, -20 + rnd() * H * 0.35);
            }
            for (let i = meteors.length - 1; i >= 0; i -= 1) {
                const m = meteors[i];
                if (m.live) {
                    m.hist.unshift(m.x, m.y);
                    m.vy += GRAVITY;
                    m.x += m.vx;
                    m.y += m.vy;
                    if (m.x > W + 70 || m.y > H + 70) {
                        m.live = false;
                    }
                } else {
                    m.hist.pop();
                    m.hist.pop();
                }
                if (m.hist.length > TRAIL_LEN * 2) {
                    m.hist.length = TRAIL_LEN * 2;
                }
                if (!m.live && m.hist.length === 0) {
                    meteors.splice(i, 1);
                }
            }
        },
        draw(ctx: CanvasRenderingContext2D): void {
            // 매 프레임 배경을 덜 덮어 옛 흔적이 남는다 — 잔광
            paintBg(ctx, primed ? 1 - FADE : 1);
            primed = true;
            for (let i = 0; i < dims.length; i += 1) {
                const s = dims[i];
                ctx.fillStyle = rgba(STAR_RGBS[i % STAR_RGBS.length], 0.35 + 0.3 * Math.sin(t * 0.04 + s.p));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, PI2);
                ctx.fill();
            }
            ctx.lineCap = 'round';
            for (let i = 0; i < meteors.length; i += 1) {
                const m = meteors[i];
                const n = Math.floor(m.hist.length / 2);
                let px = m.live ? m.x : (n > 0 ? m.hist[0] : 0);
                let py = m.live ? m.y : (n > 0 ? m.hist[1] : 0);
                for (let k = 0; k < n; k += 1) {
                    const age = k / TRAIL_LEN;
                    const a = Math.pow(1 - age, 1.6);
                    const c = mix(HEAD, TAIL, age);
                    const hx = m.hist[k * 2];
                    const hy = m.hist[k * 2 + 1];
                    ctx.strokeStyle = rgba(c, 0.22 * a);
                    ctx.lineWidth = (7 * (1 - age) + 1) * 2.2;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(hx, hy);
                    ctx.stroke();
                    ctx.strokeStyle = rgba(c, a);
                    ctx.lineWidth = 6 * (1 - age) + 0.8;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(hx, hy);
                    ctx.stroke();
                    px = hx;
                    py = hy;
                }
                if (m.live) {
                    glow(ctx, m.x, m.y, 16, HEAD, 0.75);
                }
            }
        },
        label(): string {
            return ownLeft > 0 ? TXT_OWN : TXT_FLOW;
        },
        tap(): void {
            launch(inp.x, inp.y);
            ownLeft = 90;
        }
    };
    if (reduce) {
        for (let i = 0; i < 70; i += 1) {
            scene.step();
        }
    }
    return scene;
}

export default function SfShootingStarTrail() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const statusEl = statusRef.current;
    const btnEl = btnRef.current;
    if (!root || !canvas || !statusEl || !btnEl) return;
    return start(root, canvas, statusEl, btnEl, makeScene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.sc} is-demo`} ref={rootRef}>
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="꼬리가 점점 옅어지며 휘어 떨어지는 별똥별" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">별똥별 — 꼬리는 나이만큼 옅어진다</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>꼬리가 점점 옅어지며 휘어 떨어지는 별똥별</p>
      </div>
    </main>
  );
}
