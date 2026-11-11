import { useEffect, useRef } from "react";
import styles from "./SfHyperspaceJumpEase.module.scss";

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

const JUMP_EASE = 6;
const MAX_SPEED = 70;
const FLASH = 1;
const HOLD = 18;
const RAMP = 72;
const FLASH_TICKS = 24;
const SETTLE = 56;
const BASE_SPEED = 1.6;
const STREAK = 1.1;
const FOV = 170;
const STAR_COUNT = 260;
const Z_FAR = 1000;
const Z_NEAR = 20;
const SPREAD = 700;
const CYCLE = HOLD + RAMP + FLASH_TICKS + SETTLE;
const TXT_HOLD = '정지 — 점프 준비';
const TXT_RAMP = '가속 — 지수 곡선으로 오른다';
const TXT_FLASH = '점프 — 섬광';
const TXT_SETTLE = '도착 — 속도가 돌아온다';

interface Star { x: number; y: number; z: number; c: RGB; }

// t 틱 시점의 속도. 올라갈 때만 2 의 거듭제곱 곡선이고 나머지는 부드러운 복귀
function speedAt(t: number): number {
    if (t < HOLD) {
        return BASE_SPEED;
    }
    if (t < HOLD + RAMP) {
        const p = (t - HOLD) / RAMP;
        return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (Math.pow(2, JUMP_EASE * p) - 1) / (Math.pow(2, JUMP_EASE) - 1);
    }
    if (t < HOLD + RAMP + FLASH_TICKS) {
        const q = (t - HOLD - RAMP) / FLASH_TICKS;
        return lerp(MAX_SPEED, BASE_SPEED, smooth(q));
    }
    return BASE_SPEED;
}
function flashAt(t: number): number {
    const q = (t - HOLD - RAMP) / FLASH_TICKS;
    if (q < 0 || q > 1) {
        return 0;
    }
    return FLASH * (1 - q) * (1 - q);
}

function makeScene(inp: Input, reduce: boolean): Scene {
    const rnd = lcg(450505);
    const stars: Star[] = [];
    let t = 0;
    let speed = BASE_SPEED;
    let primed = false;
    function place(s: Star, far: boolean): void {
        s.x = (rnd() * 2 - 1) * SPREAD;
        s.y = (rnd() * 2 - 1) * SPREAD * 0.65;
        s.z = far ? Z_FAR : Z_NEAR + rnd() * (Z_FAR - Z_NEAR);
    }
    for (let i = 0; i < STAR_COUNT; i += 1) {
        const s: Star = { x: 0, y: 0, z: 0, c: STAR_RGBS[i % STAR_RGBS.length] };
        place(s, false);
        stars.push(s);
    }
    const scene: Scene = {
        step(): void {
            t = (t + 1) % CYCLE;
            speed = speedAt(t);
            for (let i = 0; i < stars.length; i += 1) {
                const s = stars[i];
                s.z -= speed;
                const sx = W / 2 + s.x * FOV / s.z;
                const sy = H / 2 + s.y * FOV / s.z;
                if (s.z < Z_NEAR || sx < -100 || sx > W + 100 || sy < -100 || sy > H + 100) {
                    place(s, true);
                }
            }
        },
        draw(ctx: CanvasRenderingContext2D): void {
            paintBg(ctx, primed ? (speed > 12 ? 0.55 : 1) : 1);
            primed = true;
            ctx.lineCap = 'round';
            for (let i = 0; i < stars.length; i += 1) {
                const s = stars[i];
                const k = 1 - s.z / Z_FAR;
                // 줄기 길이도 같은 speed 값에서 나온다
                const zb = Math.min(s.z + speed * STREAK, Z_FAR * 1.5);
                ctx.strokeStyle = rgba(s.c, 0.3 + 0.7 * k);
                ctx.lineWidth = 0.7 + 2.4 * k * k;
                ctx.beginPath();
                ctx.moveTo(W / 2 + s.x * FOV / zb, H / 2 + s.y * FOV / zb);
                ctx.lineTo(W / 2 + s.x * FOV / s.z, H / 2 + s.y * FOV / s.z);
                ctx.stroke();
            }
            const f = flashAt(t);
            const ramp = clamp((speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED), 0, 1);
            if (ramp > 0.05) {
                glow(ctx, W / 2, H / 2, 40 + 200 * ramp, [208, 196, 255], 0.45 * ramp);
            }
            if (f > 0) {
                ctx.fillStyle = rgba([244, 240, 255], 0.9 * f);
                ctx.fillRect(0, 0, W, H);
                glow(ctx, W / 2, H / 2, 260, [255, 255, 255], f);
            }
        },
        label(): string {
            if (t < HOLD) { return TXT_HOLD; }
            if (t < HOLD + RAMP) { return TXT_RAMP; }
            if (t < HOLD + RAMP + FLASH_TICKS) { return TXT_FLASH; }
            return TXT_SETTLE;
        },
        tap(): void {
            t = HOLD;
        }
    };
    if (reduce) {
        t = HOLD + 50;
        for (let i = 0; i < 6; i += 1) {
            scene.step();
        }
    }
    return scene;
}

export default function SfHyperspaceJumpEase() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="멈춰 있다가 빛의 속도로 뛰어드는 점프 곡선" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">정지 — 점프 준비</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>멈춰 있다가 빛의 속도로 뛰어드는 점프 곡선</p>
      </div>
    </main>
  );
}
