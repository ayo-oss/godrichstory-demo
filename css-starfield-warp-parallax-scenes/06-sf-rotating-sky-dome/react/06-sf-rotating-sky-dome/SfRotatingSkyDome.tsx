import { useEffect, useRef } from "react";
import styles from "./SfRotatingSkyDome.module.scss";

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

const YAW_RATE = 0.012;
const PITCH = 0.38;
const FOV = 150;
const STAR_COUNT = 900;
const BAND_STARS = 520;
const GRID_STEP = 72;
const NEAR_CUT = 0.08;
const TXT_AUTO = '하늘 돔이 천천히 돈다';
const TXT_LOOK = '포인터 방향으로 고개를 돌린다';

interface Sky { x: number; y: number; z: number; m: number; c: RGB; }

function makeScene(inp: Input, reduce: boolean): Scene {
    const rnd = lcg(450606);
    const stars: Sky[] = [];
    // 구면 위 고른 분포 — 높이 z 를 -1 이상 1 이하에서 고르게, 방위각도 고르게
    for (let i = 0; i < STAR_COUNT; i += 1) {
        const zz = rnd() * 2 - 1;
        const ph = rnd() * PI2;
        const rr = Math.sqrt(1 - zz * zz);
        stars.push({ x: rr * Math.cos(ph), y: zz, z: rr * Math.sin(ph), m: rnd(), c: STAR_RGBS[i % STAR_RGBS.length] });
    }
    // 은하수 띠 — 기울어진 큰 원 둘레에 좁게 모은 별
    const tilt = 0.6;
    for (let i = 0; i < BAND_STARS; i += 1) {
        const ph = rnd() * PI2;
        const lat = (rnd() + rnd() + rnd() - 1.5) * 0.2;
        const bx = Math.cos(lat) * Math.cos(ph);
        const by = Math.sin(lat);
        const bz = Math.cos(lat) * Math.sin(ph);
        stars.push({ x: bx, y: by * Math.cos(tilt) - bz * Math.sin(tilt), z: by * Math.sin(tilt) + bz * Math.cos(tilt), m: rnd() * 0.5, c: STAR_RGBS[2] });
    }
    let yaw = 0;
    let pitch = PITCH;
    let t = 0;
    let look = 0;
    let lookP = 0;
    function project(x: number, y: number, z: number, cy: number, sy: number, cp: number, sp: number): [number, number, number] {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        return [W / 2 + FOV * x1 / z2, H / 2 - FOV * y2 / z2, z2];
    }
    const scene: Scene = {
        step(): void {
            t += 1;
            let ly = 0;
            let lp = 0.22 * Math.sin(t * 0.008);
            if (inp.idle < IDLE_TICKS) {
                ly = (inp.x - W / 2) / W * 1.6;
                lp = (H / 2 - inp.y) / H * 0.9;
            }
            look = lerp(look, ly, 0.06);
            lookP = lerp(lookP, lp, 0.06);
            yaw += YAW_RATE;
            pitch = PITCH + lookP;
        },
        draw(ctx: CanvasRenderingContext2D): void {
            paintBg(ctx, 1);
            const cyw = Math.cos(yaw + look);
            const syw = Math.sin(yaw + look);
            const cp = Math.cos(pitch);
            const sp = Math.sin(pitch);
            // 위도선과 경선 — 점으로만 그려 돌아가는 방향이 보이게
            ctx.fillStyle = rgba([208, 196, 255], 0.55);
            for (let la = -60; la <= 60; la += 30) {
                const rl = Math.cos(la * Math.PI / 180);
                const yl = Math.sin(la * Math.PI / 180);
                for (let a = 0; a < 360; a += 5) {
                    const p = project(rl * Math.cos(a * Math.PI / 180), yl, rl * Math.sin(a * Math.PI / 180), cyw, syw, cp, sp);
                    if (p[2] > NEAR_CUT) {
                        ctx.fillRect(p[0] - 0.9, p[1] - 0.9, 1.9, 1.9);
                    }
                }
            }
            for (let me = 0; me < 360; me += GRID_STEP / 2) {
                for (let a = -80; a <= 80; a += 5) {
                    const rl = Math.cos(a * Math.PI / 180);
                    const p = project(rl * Math.cos(me * Math.PI / 180), Math.sin(a * Math.PI / 180), rl * Math.sin(me * Math.PI / 180), cyw, syw, cp, sp);
                    if (p[2] > NEAR_CUT) {
                        ctx.fillRect(p[0] - 0.9, p[1] - 0.9, 1.9, 1.9);
                    }
                }
            }
            for (let i = 0; i < stars.length; i += 1) {
                const s = stars[i];
                const p = project(s.x, s.y, s.z, cyw, syw, cp, sp);
                if (p[2] <= NEAR_CUT || p[0] < -6 || p[0] > W + 6 || p[1] < -6 || p[1] > H + 6) {
                    continue;
                }
                const r = 0.5 + 1.9 * s.m * s.m * s.m + (i < STAR_COUNT ? 0.3 : 0);
                const a = 0.35 + 0.65 * clamp(p[2] * 1.2, 0, 1);
                if (r > 1.5) {
                    glow(ctx, p[0], p[1], r * 5, s.c, 0.35 * a);
                }
                ctx.fillStyle = rgba(s.c, a);
                ctx.beginPath();
                ctx.arc(p[0], p[1], r, 0, PI2);
                ctx.fill();
            }
        },
        label(): string {
            return inp.idle < IDLE_TICKS ? TXT_LOOK : TXT_AUTO;
        },
        tap(): void {
            yaw += Math.PI / 3;
        }
    };
    if (reduce) {
        for (let i = 0; i < 60; i += 1) {
            scene.step();
        }
    }
    return scene;
}

export default function SfRotatingSkyDome() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="구면 위의 별을 회전 행렬로 돌려 보는 하늘 돔" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">하늘 돔이 천천히 돈다</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>구면 위의 별을 회전 행렬로 돌려 보는 하늘 돔</p>
      </div>
    </main>
  );
}
