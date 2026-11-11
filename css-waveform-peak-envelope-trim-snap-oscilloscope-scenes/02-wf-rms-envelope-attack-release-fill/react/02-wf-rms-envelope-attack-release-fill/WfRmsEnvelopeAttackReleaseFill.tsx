import { useEffect, useRef } from "react";
import styles from "./WfRmsEnvelopeAttackReleaseFill.module.scss";

const W = 480;
const H = 300;
const PI2 = Math.PI * 2;
const FIXED_DT = 16;
const IDLE_STEPS = 220;
const REDUCE_STEP_MS = 900;
const REDUCE_WARM_STEPS = 40;
const BTN_PAUSE = '멈춤';
const BTN_PLAY = '재생';
const BTN_NEXT = '다음 순간';

type RGB = [number, number, number];

// 파스텔 팔레트와 어두운 바탕 두 끝 색
const PINK: RGB = [255, 170, 196];
const MINT: RGB = [150, 226, 196];
const LILAC: RGB = [196, 176, 255];
const SKY_BLUE: RGB = [150, 214, 255];
const BUTTER: RGB = [255, 230, 150];
const CREAM: RGB = [255, 247, 230];
const INK: RGB = [23, 20, 26];
const BG_TOP: RGB = [24, 21, 40];
const BG_BOT: RGB = [48, 42, 78];

interface Host {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    root: HTMLElement;
    reduce: boolean;
    touch(): void;
    auto(): boolean;
    refresh(): void;
    say(text: string): void;
    local(e: MouseEvent): [number, number];
    listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void;
}

interface Scene {
    step(): void;
    draw(): void;
}

function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
function rgba(c: RGB, a: number): string { return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a.toFixed(3) + ')'; }

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

// 사인 두 개를 음절마다 갈아 끼우고 엔벨로프를 씌운 합성 신호 (소리는 재생하지 않고 수치만 만든다)
function synth(n: number, seed: number): Float32Array {
    const rnd = lcg(seed);
    const out = new Float32Array(n);
    let i = 0;
    let p1 = 0;
    let p2 = 0;
    let peak = 0.0001;
    while (i < n) {
        const len = 1800 + Math.floor(rnd() * 4200);
        const amp = 0.18 + rnd() * 0.82;
        const rest = rnd() < 0.18;
        const f1 = 0.02 + rnd() * 0.09;
        const f2 = f1 * (1.5 + rnd());
        const stop = Math.min(n, i + len);
        for (let k = i; k < stop; k += 1) {
            const x = (k - i) / len;
            const env = Math.min(1, x / 0.06) * Math.pow(1 - x, 0.8);
            p1 += PI2 * f1;
            p2 += PI2 * f2;
            const tone = Math.sin(p1) * 0.7 + Math.sin(p2) * 0.3;
            const gain = rest ? 0.03 : amp * env;
            const v = gain * tone + (rnd() - 0.5) * 0.08 * (rest ? 0.4 : amp);
            out[k] = v;
            const a = Math.abs(v);
            if (a > peak) { peak = a; }
        }
        i = stop;
    }
    const norm = 0.92 / peak;
    for (let k = 0; k < n; k += 1) { out[k] *= norm; }
    return out;
}

// 표본 구간 [a, b) 의 최솟값과 최댓값 — 결과는 rangeLo, rangeHi 에 둔다
let rangeLo = 0;
let rangeHi = 0;
function scanRange(sig: Float32Array, a: number, b: number): void {
    const from = Math.max(0, Math.floor(a));
    const to = Math.min(sig.length, Math.max(from + 1, Math.ceil(b)));
    let lo = 1e9;
    let hi = -1e9;
    for (let i = from; i < to; i += 1) {
        const v = sig[i];
        if (v < lo) { lo = v; }
        if (v > hi) { hi = v; }
    }
    if (lo > hi) { lo = 0; hi = 0; }
    rangeLo = lo;
    rangeHi = hi;
}

function paintBg(ctx: CanvasRenderingContext2D, top: RGB, bot: RGB): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(1, rgba(bot, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
}

// 가짜 포인터 — 시연 동안 손이 움직이는 것처럼 보이게 그린다
function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number, down: boolean): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(4, 11.5);
    ctx.lineTo(7.5, 18);
    ctx.lineTo(10, 16.8);
    ctx.lineTo(6.6, 10.4);
    ctx.lineTo(11.5, 10.2);
    ctx.closePath();
    ctx.fillStyle = rgba(CREAM, 1);
    ctx.strokeStyle = rgba(INK, 1);
    ctx.lineWidth = 1.4;
    ctx.fill();
    ctx.stroke();
    if (down) {
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, PI2);
        ctx.strokeStyle = rgba(PINK, 0.9);
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();
}

function boot(root: HTMLElement, make: (h: Host) => Scene): () => void {
    const canvasEl = root.querySelector('[data-role="canvas"]');
    const statusEl = root.querySelector('[data-role="status"]');
    const btnEl = root.querySelector('[data-role="btn"]');
    if (!(canvasEl instanceof HTMLCanvasElement) || !statusEl || !(btnEl instanceof HTMLButtonElement)) {
        return function (): void { /* 필요한 요소가 없으면 아무것도 하지 않는다 */ };
    }
    const ctxOrNull = canvasEl.getContext('2d');
    if (!ctxOrNull) {
        return function (): void { /* 2d 문맥이 없으면 아무것도 하지 않는다 */ };
    }
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxOrNull;
    const status: Element = statusEl;
    const btn: HTMLButtonElement = btnEl;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleaners: Array<() => void> = [];
    let paused = false;
    let idle = IDLE_STEPS + 1;
    let clock = 0;
    let lastSayAt = -1e9;
    let lastText = status.textContent || '';
    let scene: Scene | null = null;
    let rafId = 0;
    let acc = 0;
    let lastTs = -1;

    function isAuto(): boolean { return !reduce && !paused && idle > IDLE_STEPS; }
    function sync(): void {
        const on = isAuto();
        if (root.classList.contains('is-demo') !== on) {
            root.classList.toggle('is-demo', on);
        }
    }
    function fit(): void {
        const r = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const cw = Math.max(1, Math.round(r.width * dpr));
        const ch = Math.max(1, Math.round(r.height * dpr));
        canvas.width = cw;
        canvas.height = ch;
        ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);
    }
    const host: Host = {
        ctx,
        canvas,
        root,
        reduce,
        touch(): void {
            idle = 0;
            sync();
        },
        auto: isAuto,
        refresh(): void {
            if (scene) { scene.draw(); }
        },
        say(text: string): void {
            if (text === lastText) { return; }
            if (!reduce && clock - lastSayAt < 250) { return; }
            lastText = text;
            lastSayAt = clock;
            // 시연이 혼자 돌 때는 읽어 주지 않고, 사람이 만졌을 때만 알린다
            status.setAttribute('aria-live', isAuto() ? 'off' : 'polite');
            status.textContent = text;
        },
        local(e: MouseEvent): [number, number] {
            const r = canvas.getBoundingClientRect();
            return [clamp((e.clientX - r.left) * W / Math.max(1, r.width), 0, W), clamp((e.clientY - r.top) * H / Math.max(1, r.height), 0, H)];
        },
        listen(target: EventTarget, type: string, fn: (e: Event) => void, opts?: AddEventListenerOptions): void {
            target.addEventListener(type, fn, opts);
            cleaners.push(function (): void { target.removeEventListener(type, fn, opts); });
        }
    };
    function advance(ms: number): void {
        if (!scene) { return; }
        const n = Math.max(1, Math.round(ms / FIXED_DT));
        for (let i = 0; i < n; i += 1) {
            idle += 1;
            clock += FIXED_DT;
            scene.step();
        }
    }
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min(ts - lastTs, 160);
        lastTs = ts;
        if (!paused && scene) {
            acc += dt;
            while (acc >= FIXED_DT) {
                idle += 1;
                clock += FIXED_DT;
                scene.step();
                acc -= FIXED_DT;
            }
            sync();
            scene.draw();
        }
        rafId = requestAnimationFrame(frame);
    }
    scene = make(host);
    btn.textContent = reduce ? BTN_NEXT : BTN_PAUSE;
    fit();
    if (reduce) {
        root.classList.remove('is-demo');
        advance(REDUCE_WARM_STEPS * FIXED_DT);
    }
    scene.draw();
    host.listen(btn, 'click', function (): void {
        if (reduce) {
            advance(REDUCE_STEP_MS);
            host.refresh();
            return;
        }
        paused = !paused;
        btn.textContent = paused ? BTN_PLAY : BTN_PAUSE;
        sync();
    });
    host.listen(window, 'resize', function (): void {
        fit();
        host.refresh();
    });
    if (!reduce) {
        rafId = requestAnimationFrame(frame);
    }
    return function (): void {
        cancelAnimationFrame(rafId);
        for (let i = 0; i < cleaners.length; i += 1) { cleaners[i](); }
    };
}

const SAMPLE_N = 43200;
const ATTACK_K = 0.5;
const RELEASE_K = 0.06;
const RMS_WIN = 160;
const FILL_ALPHA = 0.55;
const COL_PX = 2;
const VIEW_SAMPLES = 14400;
const SLIDE_STEP = 60;
const WARM_COLS = 30;
const MID_Y = 140;
const HALF_Y = 84;
const VIS_GAIN = 1.5;
const TXT_ENV = '제곱평균 / 윤곽';

// 끝 위치 end 바로 앞 win 개 표본의 제곱평균 제곱근
function rmsAt(sig: Float32Array, end: number, win: number): number {
    const to = clamp(Math.floor(end), 1, sig.length);
    const from = Math.max(0, to - win);
    let sum = 0;
    for (let i = from; i < to; i += 1) { sum += sig[i] * sig[i]; }
    return Math.sqrt(sum / Math.max(1, to - from));
}

// 공격 계수와 해제 계수가 다른 지수 평활 — 오를 때는 빨리, 내릴 때는 천천히 따라간다
function followEnvelope(values: number[], attackK: number, releaseK: number): number[] {
    const out: number[] = [];
    let e = 0;
    for (let i = 0; i < values.length; i += 1) {
        const v = values[i];
        e += (v > e ? attackK : releaseK) * (v - e);
        out.push(e);
    }
    return out;
}

function makeEnvelopeScene(h: Host): Scene {
    const sig = synth(SAMPLE_N, 4591);
    let start = 0;
    let dir = 1;
    let k = 0;
    let cursorX = 200;
    function move(x: number): void {
        cursorX = clamp(x, 0, W - 1);
        h.touch();
        h.refresh();
    }
    h.listen(h.canvas, 'pointermove', function (e: Event): void {
        move(h.local(e as PointerEvent)[0]);
    });
    h.listen(h.canvas, 'keydown', function (e: Event): void {
        const key = (e as KeyboardEvent).key;
        if (key === 'ArrowLeft') {
            e.preventDefault();
            move(cursorX - 12);
        }
        else if (key === 'ArrowRight') {
            e.preventDefault();
            move(cursorX + 12);
        }
    });
    return {
        step(): void {
            k += 1;
            start += dir * SLIDE_STEP;
            if (start > SAMPLE_N - VIEW_SAMPLES) {
                start = SAMPLE_N - VIEW_SAMPLES;
                dir = -1;
            }
            else if (start < 0) {
                start = 0;
                dir = 1;
            }
            if (h.auto()) {
                cursorX = W * (0.5 + 0.4 * Math.sin(k * 0.03));
            }
        },
        draw(): void {
            const ctx = h.ctx;
            paintBg(ctx, BG_TOP, BG_BOT);
            const n = Math.floor(W / COL_PX);
            const per = VIEW_SAMPLES / n;
            const raw: number[] = [];
            for (let c = -WARM_COLS; c < n; c += 1) {
                raw.push(rmsAt(sig, start + (c + 1) * per, RMS_WIN));
            }
            const env = followEnvelope(raw, ATTACK_K, RELEASE_K);
            // 원래 최대·최소 기둥은 옅게 깔아 두고 그 위에 윤곽을 얹는다
            for (let c = 0; c < n; c += 1) {
                scanRange(sig, start + c * per, start + (c + 1) * per);
                ctx.fillStyle = rgba(LILAC, 0.42);
                ctx.fillRect(c * COL_PX, MID_Y - rangeHi * HALF_Y, COL_PX - 0.5, (rangeHi - rangeLo) * HALF_Y + 1);
            }
            ctx.beginPath();
            for (let c = 0; c < n; c += 1) {
                const y = MID_Y - Math.min(1, env[c + WARM_COLS] * VIS_GAIN) * HALF_Y;
                if (c === 0) { ctx.moveTo(0, y); } else { ctx.lineTo(c * COL_PX, y); }
            }
            for (let c = n - 1; c >= 0; c -= 1) {
                const y = MID_Y + Math.min(1, env[c + WARM_COLS] * VIS_GAIN) * HALF_Y;
                ctx.lineTo(c * COL_PX, y);
            }
            ctx.closePath();
            ctx.fillStyle = rgba(MINT, FILL_ALPHA);
            ctx.fill();
            ctx.strokeStyle = rgba(CREAM, 0.9);
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // 순간 제곱평균 — 평활 전의 들쭉날쭉한 값
            ctx.beginPath();
            for (let c = 0; c < n; c += 1) {
                const y = MID_Y - Math.min(1, raw[c + WARM_COLS] * VIS_GAIN) * HALF_Y;
                if (c === 0) { ctx.moveTo(0, y); } else { ctx.lineTo(c * COL_PX, y); }
            }
            ctx.strokeStyle = rgba(SKY_BLUE, 0.95);
            ctx.lineWidth = 1;
            ctx.stroke();
            const cc = clamp(Math.floor(cursorX / COL_PX), 0, n - 1);
            ctx.fillStyle = rgba(BUTTER, 0.85);
            ctx.fillRect(cc * COL_PX, 40, 1.5, 200);
            h.say(TXT_ENV + ': ' + raw[cc + WARM_COLS].toFixed(2) + ' / ' + env[cc + WARM_COLS].toFixed(2));
        }
    };
}

export default function WfRmsEnvelopeAttackReleaseFill() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return boot(root, makeEnvelopeScene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.wf} is-demo`} ref={rootRef}>
        <canvas className={styles.canvas} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="공격은 빠르고 해제는 느린 추종기가 소리 크기 윤곽을 매끈하게 채우는 파형" />
        <p className={styles.status} data-role="status" aria-live="polite">제곱평균 / 윤곽</p>
        <button className={styles.btn} data-role="btn" type="button">멈춤</button>
        <p className={styles.caption}>공격은 빠르고 해제는 느린 추종기가 소리 크기 윤곽을 매끈하게 채우는 파형</p>
      </div>
    </main>
  );
}
