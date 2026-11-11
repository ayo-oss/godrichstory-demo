import { useEffect, useRef } from "react";
import styles from "./WfLiveRecordAppendAutoGain.module.scss";

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

const GAIN_TARGET = 0.8;
const GAIN_RISE = 0.012;
const GAIN_FALL = 0.35;
const SCROLL_PX = 2;
const PER_STEP = 80;
const MAX_GAIN = 8;
const MID_Y = 140;
const HALF_Y = 82;
const PEAK_DECAY = 0.996;
const BURST_EVERY = 150;
const REDUCE_APPEND = 30;
const TXT_GAIN = '자동 이득';
const TXT_CLIP = '넘침';

// 자동 이득 한 걸음 — 최근 최댓값을 따라 목표 크기가 되도록 이득을 조절한다 (올릴 땐 천천히, 내릴 땐 빠르게)
function stepGain(gain: number, peakHold: number, target: number, rise: number, fall: number): number {
    const want = clamp(target / Math.max(peakHold, 0.0001), 0.5, MAX_GAIN);
    return gain + (want - gain) * (want < gain ? fall : rise);
}

function makeRecordScene(h: Host): Scene {
    const nCols = Math.floor(W / SCROLL_PX);
    const rawLo: number[] = [];
    const rawHi: number[] = [];
    const gains: number[] = [];
    for (let i = 0; i < nCols; i += 1) { rawLo.push(0); rawHi.push(0); gains.push(1); }
    let gain = 1;
    let peakHold = 0.1;
    let n = 0;
    let k = 0;
    let burst = 0;
    function level(): number {
        const quiet = 0.1 + 0.05 * Math.sin(k * 0.05);
        return quiet + burst * 0.85;
    }
    function append(): void {
        const lv = level();
        let lo = 1e9;
        let hi = -1e9;
        for (let i = 0; i < PER_STEP; i += 1) {
            const ph = (n + i) * 0.19;
            const v = lv * (Math.sin(ph) * 0.8 + Math.sin(ph * 2.3 + 0.5) * 0.25) + (hash1(n + i, 21) - 0.5) * 0.04;
            if (v < lo) { lo = v; }
            if (v > hi) { hi = v; }
        }
        n += PER_STEP;
        const stepPeak = Math.max(Math.abs(lo), Math.abs(hi));
        peakHold = Math.max(stepPeak, peakHold * PEAK_DECAY);
        gain = stepGain(gain, peakHold, GAIN_TARGET, GAIN_RISE, GAIN_FALL);
        rawLo.shift();
        rawHi.shift();
        gains.shift();
        rawLo.push(lo);
        rawHi.push(hi);
        gains.push(gain);
    }
    function clap(): void {
        burst = 1;
        if (h.reduce) {
            // 움직임 줄이기에서는 흐름 없이 박수 뒤 서른 칸을 한꺼번에 이어 붙여 보여 준다
            for (let i = 0; i < REDUCE_APPEND; i += 1) {
                k += 1;
                append();
                burst *= 0.93;
            }
        }
        h.touch();
        h.refresh();
    }
    h.listen(h.canvas, 'pointerdown', function (): void { clap(); });
    h.listen(h.canvas, 'keydown', function (e: Event): void {
        const key = (e as KeyboardEvent).key;
        if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            clap();
        }
    });
    for (let i = 0; i < nCols + 20; i += 1) {
        k += 1;
        append();
    }
    return {
        step(): void {
            k += 1;
            if (h.auto() && k % BURST_EVERY === 0) { burst = 1; }
            append();
            burst *= 0.93;
            if (h.reduce) { burst = burst < 0.02 ? 0 : burst; }
        },
        draw(): void {
            const ctx = h.ctx;
            paintBg(ctx, BG_TOP, BG_BOT);
            ctx.fillStyle = rgba(CREAM, 0.14);
            ctx.fillRect(0, MID_Y, W - 24, 1);
            let clipped = false;
            for (let c = 0; c < nCols; c += 1) {
                const x = c * SCROLL_PX;
                const g = gains[c];
                // 이득을 곱하기 전 모습은 옅게
                ctx.fillStyle = rgba(LILAC, 0.3);
                ctx.fillRect(x, MID_Y - rawHi[c] * HALF_Y, SCROLL_PX, Math.max(1, (rawHi[c] - rawLo[c]) * HALF_Y));
                const hi = rawHi[c] * g;
                const lo = rawLo[c] * g;
                const over = hi > 1 || lo < -1;
                if (over && c > nCols - 12) { clipped = true; }
                const y1 = MID_Y - clamp(hi, -1, 1) * HALF_Y;
                const y2 = MID_Y - clamp(lo, -1, 1) * HALF_Y;
                ctx.fillStyle = over ? rgba(PINK, 1) : rgba(MINT, 1);
                ctx.fillRect(x, y1, SCROLL_PX, Math.max(1, y2 - y1));
            }
            // 이득 눈금 — 1배 위치에 가로선
            const mx = W - 16;
            ctx.fillStyle = rgba(CREAM, 0.14);
            ctx.fillRect(mx, 40, 8, 196);
            const gy = 236 - clamp(gain / MAX_GAIN, 0, 1) * 196;
            ctx.fillStyle = rgba(BUTTER, 1);
            ctx.fillRect(mx, gy, 8, 236 - gy);
            ctx.fillStyle = rgba(CREAM, 0.8);
            ctx.fillRect(mx - 3, 236 - 196 / MAX_GAIN, 14, 1);
            // 녹음 표시
            ctx.beginPath();
            ctx.arc(W - 40, 22, 5, 0, PI2);
            ctx.fillStyle = (Math.floor(k / 20) % 2 === 0 || h.reduce) ? rgba(PINK, 1) : rgba(PINK, 0.25);
            ctx.fill();
            h.say(clipped ? TXT_CLIP + ': ' + gain.toFixed(1) + ' x' : TXT_GAIN + ': ' + gain.toFixed(1) + ' x');
        }
    };
}

export default function WfLiveRecordAppendAutoGain() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return boot(root, makeRecordScene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.wf} is-demo`} ref={rootRef}>
        <canvas className={styles.canvas} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="녹음 중인 소리가 오른쪽에서 이어 붙고 자동 이득이 작은 소리를 끌어올리는 파형" />
        <p className={styles.status} data-role="status" aria-live="polite">자동 이득</p>
        <button className={styles.btn} data-role="btn" type="button">멈춤</button>
        <p className={styles.caption}>녹음 중인 소리가 오른쪽에서 이어 붙고 자동 이득이 작은 소리를 끌어올리는 파형</p>
      </div>
    </main>
  );
}
