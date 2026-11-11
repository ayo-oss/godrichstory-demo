import { useEffect, useRef } from "react";
import styles from "./SfParallaxDepthLayers.module.scss";

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

const LAYER_COUNT = 3;
const PARALLAX = 70;
const DRIFT = 0.9;
const DEPTH_SCALE = 2.4;
const LAYER_STARS = [110, 80, 50];
const LAYER_DEPTH = [4, 2, 1];
const TXT_AUTO = '자동 곡선 — 앞 층이 더 크게 움직인다';
const TXT_POINTER = '포인터를 따라 세 층이 어긋난다';

interface Dot { x: number; y: number; r: number; c: RGB; }
interface Mist { x: number; y: number; r: number; c: RGB; }

function makeScene(inp: Input, reduce: boolean): Scene {
    const rnd = lcg(450202);
    const layers: Dot[][] = [];
    const mists: Mist[][] = [];
    for (let li = 0; li < LAYER_COUNT; li += 1) {
        const d = LAYER_DEPTH[li];
        const dots: Dot[] = [];
        for (let i = 0; i < LAYER_STARS[li]; i += 1) {
            dots.push({ x: rnd() * W, y: rnd() * H, r: DEPTH_SCALE / Math.pow(d, 0.8) * (0.55 + 0.9 * rnd()), c: STAR_RGBS[Math.floor(rnd() * STAR_RGBS.length)] });
        }
        layers.push(dots);
        const ms: Mist[] = [];
        for (let i = 0; i < 2; i += 1) {
            ms.push({ x: rnd() * W, y: rnd() * H, r: 70 + 30 * rnd() + 18 * (LAYER_COUNT - li), c: STAR_RGBS[(li * 2 + i + 2) % STAR_RGBS.length] });
        }
        mists.push(ms);
    }
    let t = 0;
    let dir = 1;
    let drift = 0;
    let px = 0;
    let py = 0;
    function wrap(v: number, m: number): number {
        return ((v % m) + m) % m;
    }
    const scene: Scene = {
        step(): void {
            t += 1;
            drift += dir * DRIFT;
            let tx = Math.sin(t * 0.017) * 0.95;
            let ty = Math.sin(t * 0.011) * 0.8;
            if (inp.idle < IDLE_TICKS) {
                tx = (inp.x - W / 2) / (W / 2);
                ty = (inp.y - H / 2) / (H / 2);
            }
            px = lerp(px, tx, 0.1);
            py = lerp(py, ty, 0.1);
        },
        draw(ctx: CanvasRenderingContext2D): void {
            paintBg(ctx, 1);
            for (let li = 0; li < LAYER_COUNT; li += 1) {
                const d = LAYER_DEPTH[li];
                const ox = px * PARALLAX / d + drift / d;
                const oy = py * PARALLAX * 0.6 / d;
                const ms = mists[li];
                for (let i = 0; i < ms.length; i += 1) {
                    glow(ctx, wrap(ms[i].x - ox, W + 160) - 80, wrap(ms[i].y - oy, H + 120) - 60, ms[i].r, ms[i].c, 0.07 + 0.05 / d);
                }
                const dots = layers[li];
                const alpha = 0.35 + 0.65 / Math.sqrt(d);
                for (let i = 0; i < dots.length; i += 1) {
                    const s = dots[i];
                    const sx = wrap(s.x - ox, W);
                    const sy = wrap(s.y - oy, H);
                    if (d === 1) {
                        glow(ctx, sx, sy, s.r * 4, s.c, 0.3);
                    }
                    ctx.fillStyle = rgba(s.c, alpha);
                    ctx.beginPath();
                    ctx.arc(sx, sy, s.r, 0, PI2);
                    ctx.fill();
                }
            }
        },
        label(): string {
            return inp.idle < IDLE_TICKS ? TXT_POINTER : TXT_AUTO;
        },
        tap(): void {
            dir = -dir;
        }
    };
    if (reduce) {
        for (let i = 0; i < 30; i += 1) {
            scene.step();
        }
    }
    return scene;
}

export default function SfParallaxDepthLayers() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="깊이 층마다 다른 속도로 흘러가는 별 세 겹" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">자동 곡선 — 앞 층이 더 크게 움직인다</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>깊이 층마다 다른 속도로 흘러가는 별 세 겹</p>
      </div>
    </main>
  );
}
