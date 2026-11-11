import { useEffect, useRef } from "react";
import styles from "./FwCrackleSecondarySplitDepth.module.scss";

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
interface Input { x: number; y: number; idle: number; vx: number; vy: number; dpr: number; }
interface Scene {
    step(): void;
    draw(ctx: CanvasRenderingContext2D): void;
    label(): string;
    tap(): void;
}
type Maker = (inp: Input, reduce: boolean) => Scene;

// 파스텔 알갱이 팔레트와 밤하늘 두 끝 색
const PINK: RGB = [255, 170, 196];
const MINT: RGB = [150, 226, 196];
const LILAC: RGB = [196, 176, 255];
const SKY_BLUE: RGB = [150, 214, 255];
const BUTTER: RGB = [255, 230, 150];
const CREAM: RGB = [255, 247, 230];
const PALETTE: RGB[] = [PINK, MINT, LILAC, SKY_BLUE, BUTTER];
const SKY_TOP: RGB = [18, 16, 32];
const SKY_BOT: RGB = [46, 40, 76];

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
// 시드 고정 난수 — 같은 시드면 언제나 같은 수열 (선형 합동 방식)
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return function (): number {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}
// 정수 하나와 시드로 0 이상 1 미만의 값을 만드는 해시 (같은 입력은 늘 같은 값)
function hash1(i: number, seed: number): number {
    let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function hash2(x: number, y: number, seed: number): number {
    return hash1((Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) | 0, seed);
}
// 1차원 값 노이즈 — 정수점 해시를 smooth 로 이어 붙인다
function noise1(x: number, seed: number): number {
    const xi = Math.floor(x);
    return lerp(hash1(xi, seed), hash1(xi + 1, seed), smooth(x - xi));
}
// 2차원 값 노이즈
function vnoise(x: number, y: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = smooth(x - xi);
    const fy = smooth(y - yi);
    const a = lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), fx);
    const b = lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), fx);
    return lerp(a, b, fy);
}
function rgba(c: RGB, a: number): string {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
}
function mixRGB(a: RGB, b: RGB, k: number): RGB {
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}
// 밤하늘 바탕 — 위가 어둡고 아래가 보랏빛
function drawSky(ctx: CanvasRenderingContext2D, height: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, rgba(SKY_TOP, 1));
    g.addColorStop(1, rgba(SKY_BOT, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, height);
}

function start(root: HTMLElement, canvas: HTMLCanvasElement, statusEl: HTMLElement, btnEl: HTMLElement, make: Maker): () => void {
    const ctx0 = canvas.getContext('2d');
    if (!ctx0) {
        return function (): void { return; };
    }
    const ctx: CanvasRenderingContext2D = ctx0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inp: Input = { x: W / 2, y: H / 2, idle: 99999, vx: 0, vy: 0, dpr: 1 };
    let lastPx = -1;
    let lastPy = -1;
    // 화면 배율이 바뀌어도 캔버스 픽셀 수를 다시 맞춘다
    function fit(): void {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        inp.dpr = dpr;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    const scene = make(inp, reduce);
    let paused = false;
    let rafId = 0;
    let lastTs = -1;
    let accMs = 0;
    let lastLabel = '';
    const cleaners: Array<() => void> = [];
    function listen(target: EventTarget, type: string, fn: (e: any) => void): void {
        target.addEventListener(type, fn);
        cleaners.push(function (): void { target.removeEventListener(type, fn); });
    }
    function show(): void {
        ctx.setTransform(inp.dpr, 0, 0, inp.dpr, 0, 0);
        scene.draw(ctx);
        const t = scene.label();
        if (t !== lastLabel) {
            lastLabel = t;
            statusEl.textContent = t;
        }
    }
    function tickOnce(): void {
        inp.idle += 1;
        inp.vx *= 0.9;
        inp.vy *= 0.9;
        scene.step();
    }
    function advance(ms: number): void {
        const n = Math.round(ms / FIXED_DT);
        for (let i = 0; i < n; i += 1) {
            tickOnce();
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
        const nx = clamp((e.clientX - r.left) * W / r.width, 0, W);
        const ny = clamp((e.clientY - r.top) * H / r.height, 0, H);
        if (lastPx >= 0) {
            inp.vx = lerp(inp.vx, nx - lastPx, 0.5);
            inp.vy = lerp(inp.vy, ny - lastPy, 0.5);
        }
        lastPx = nx;
        lastPy = ny;
        inp.x = nx;
        inp.y = ny;
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
                tickOnce();
                accMs -= FIXED_DT;
            }
            show();
        }
        rafId = requestAnimationFrame(tick);
    }
    btnEl.textContent = reduce ? BTN_NEXT : BTN_PAUSE;
    if (reduce) {
        root.classList.remove('is-demo');
    }
    show();
    listen(btnEl, 'click', function (): void {
        if (reduce) {
            advance(REDUCE_STEP_MS);
            show();
            return;
        }
        paused = !paused;
        if (paused) {
            root.classList.remove('is-demo');
        }
        else {
            root.classList.add('is-demo');
        }
        btnEl.textContent = paused ? BTN_PLAY : BTN_PAUSE;
    });
    listen(canvas, 'pointermove', function (e: PointerEvent): void {
        toLocal(e);
        refresh();
    });
    listen(canvas, 'pointerdown', function (e: PointerEvent): void {
        lastPx = -1;
        toLocal(e);
        scene.tap();
        refresh();
    });
    listen(canvas, 'keydown', function (e: KeyboardEvent): void {
        const k = e.key;
        let dx = 0;
        let dy = 0;
        if (k === 'Enter' || k === ' ') {
            e.preventDefault();
            scene.tap();
            refresh();
            return;
        }
        if (k === 'ArrowLeft') {
            dx = -KEY_STEP;
        }
        else if (k === 'ArrowRight') {
            dx = KEY_STEP;
        }
        else if (k === 'ArrowUp') {
            dy = -KEY_STEP;
        }
        else if (k === 'ArrowDown') {
            dy = KEY_STEP;
        }
        else {
            return;
        }
        e.preventDefault();
        inp.x = clamp(inp.x + dx, 0, W);
        inp.y = clamp(inp.y + dy, 0, H);
        inp.vx = dx * 0.5;
        inp.vy = dy * 0.5;
        inp.idle = 0;
        refresh();
    });
    listen(window, 'resize', function (): void {
        fit();
        show();
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

const SPLIT_DEPTH = 1;
const CHILD_N = 5;
const CHILD_SPEED = 1.15;
const SPLIT_P = 0.55;
const PARENT_N = 84;
const GRAIN_DRAG = 0.962;
const GRAIN_GRAVITY = 0.04;
const SHELL_GAP = 50;
const AMBIENT_DECAY = 0.965;
const PREWARM_STEPS = 52;
const TXT_AUTO = '수명이 끝난 알갱이가 다시 터진다 — 깊이는 한 단계까지';
const TXT_TAP = '누른 자리에서 두 겹으로 터진다';

interface Grain { x: number; y: number; vx: number; vy: number; age: number; life: number; depth: number; hue: RGB; }
interface Pop { x: number; y: number; age: number; }

// 수명이 끝난 알갱이가 자식을 낳는다 — 깊이가 SPLIT_DEPTH 에 닿았으면 낳지 않는다
function splitChildren(p: Grain, rng: () => number): Grain[] {
    const kids: Grain[] = [];
    if (p.depth >= SPLIT_DEPTH || rng() >= SPLIT_P) {
        return kids;
    }
    const base = rng() * PI2;
    for (let i = 0; i < CHILD_N; i += 1) {
        const a = base + (i / CHILD_N) * PI2;
        const sp = CHILD_SPEED * (0.7 + rng() * 0.6);
        kids.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 20 + rng() * 10, depth: p.depth + 1, hue: CREAM });
    }
    return kids;
}
// 측정용 — 부모 n 개가 끝날 때 몇 개가 자식을 낳고 자식 알갱이는 모두 몇 개인가
function splitTally(n: number, seed: number): { parents: number; kids: number; grandKids: number } {
    const rng = lcg(seed);
    let parents = 0;
    let kids = 0;
    let grand = 0;
    for (let i = 0; i < n; i += 1) {
        const p: Grain = { x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, depth: 0, hue: PINK };
        const k = splitChildren(p, rng);
        if (k.length > 0) {
            parents += 1;
            kids += k.length;
            grand += splitChildren(k[0], rng).length;
        }
    }
    return { parents: parents, kids: kids, grandKids: grand };
}

function makeScene(inp: Input, reduce: boolean): Scene {
    const rng = lcg(707);
    let grains: Grain[] = [];
    let pops: Pop[] = [];
    let gap = 2;
    let ambient = 0;
    let colorIdx = 0;
    function burst(x: number, y: number): void {
        const hue = PALETTE[colorIdx % PALETTE.length];
        colorIdx += 1;
        for (let i = 0; i < PARENT_N; i += 1) {
            const a = rng() * PI2;
            const sp = 0.6 + 2.4 * Math.sqrt(rng());
            grains.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 46 + rng() * 30, depth: 0, hue: hue });
        }
    }
    const scene: Scene = {
        step(): void {
            gap -= 1;
            if (gap <= 0) {
                burst(100 + rng() * 280, 80 + rng() * 70);
                gap = SHELL_GAP;
            }
            const next: Grain[] = [];
            for (let i = 0; i < grains.length; i += 1) {
                const g = grains[i];
                g.age += 1;
                g.vx *= GRAIN_DRAG;
                g.vy = g.vy * GRAIN_DRAG + GRAIN_GRAVITY;
                g.x += g.vx;
                g.y += g.vy;
                if (g.age < g.life) {
                    next.push(g);
                }
                else {
                    const kids = splitChildren(g, rng);
                    if (kids.length > 0) {
                        pops.push({ x: g.x, y: g.y, age: 0 });
                        ambient = Math.min(ambient + 0.035, 0.7);
                        for (let k = 0; k < kids.length; k += 1) {
                            next.push(kids[k]);
                        }
                    }
                }
            }
            grains = next;
            const livePops: Pop[] = [];
            for (let i = 0; i < pops.length; i += 1) {
                pops[i].age += 1;
                if (pops[i].age < 9) {
                    livePops.push(pops[i]);
                }
            }
            pops = livePops;
            ambient *= AMBIENT_DECAY;
        },
        draw(ctx: CanvasRenderingContext2D): void {
            drawSky(ctx, H);
            // 터질 때마다 쌓이는 잔광 — 하늘 전체가 라일락빛으로 물든다
            ctx.fillStyle = rgba(LILAC, ambient * (reduce ? 0.12 : 0.26));
            ctx.fillRect(0, 0, W, H);
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < pops.length; i += 1) {
                const p = pops[i];
                ctx.fillStyle = rgba(CREAM, (1 - p.age / 9) * (reduce ? 0.25 : 0.5));
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4 + p.age * 1.6, 0, PI2);
                ctx.fill();
            }
            for (let i = 0; i < grains.length; i += 1) {
                const g = grains[i];
                const a = Math.pow(1 - g.age / g.life, 0.8);
                const child = g.depth > 0;
                ctx.strokeStyle = rgba(g.hue, a * 0.5);
                ctx.lineWidth = child ? 1.8 : 1.4;
                ctx.beginPath();
                ctx.moveTo(g.x - g.vx * 1.8, g.y - g.vy * 1.8);
                ctx.lineTo(g.x, g.y);
                ctx.stroke();
                ctx.fillStyle = rgba(g.hue, a);
                ctx.beginPath();
                ctx.arc(g.x, g.y, child ? 2.1 : 1.3 + 1.4 * a, 0, PI2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'source-over';
        },
        label(): string {
            return inp.idle < IDLE_TICKS ? TXT_TAP : TXT_AUTO;
        },
        tap(): void {
            burst(inp.x, inp.y);
        }
    };
    for (let i = 0; i < PREWARM_STEPS; i += 1) {
        scene.step();
    }
    return scene;
}

export default function FwCrackleSecondarySplitDepth() {
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
        <canvas className={styles.sc__canvas} ref={canvasRef} width={480} height={300} tabIndex={0} aria-label="알갱이가 수명 끝에서 다시 잘게 터지는 두 겹 크래클" />
        <p className={styles.sc__status} ref={statusRef} aria-live="polite">수명이 끝난 알갱이가 다시 터진다 — 깊이는 한 단계까지</p>
        <button className={styles.sc__btn} ref={btnRef} type="button">멈춤</button>
        <p className={styles.sc__caption}>알갱이가 수명 끝에서 다시 잘게 터지는 두 겹 크래클</p>
      </div>
    </main>
  );
}
