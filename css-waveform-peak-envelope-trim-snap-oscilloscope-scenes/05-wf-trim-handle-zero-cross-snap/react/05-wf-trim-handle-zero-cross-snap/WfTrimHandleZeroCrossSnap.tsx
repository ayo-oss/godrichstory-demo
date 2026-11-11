import { useEffect, useRef } from "react";
import styles from "./WfTrimHandleZeroCrossSnap.module.scss";

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

const SAMPLE_N = 1920;
const SNAP_RADIUS = 6;
const HANDLE_W = 8;
const MIN_SPAN = 24;
const SNAP_EASE = 0.25;
const MID_Y = 138;
const HALF_Y = 74;
const SCRIPT_LEN = 360;
const START_A = 55.4;
const START_B = 423.6;
const TXT_SNAP = '끌려간 거리';
const TXT_STAY = '반경 안에 영점 교차 없음';
const TXT_SPAN = '선택 길이';

// 저주파 두 성분을 겹친 신호 — 영점 교차가 수십 픽셀 간격으로 나타난다
function lowSignal(n: number): Float32Array {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
        const a = Math.sin(PI2 * 0.0062 * i + 0.7) * 0.78;
        const b = Math.sin(PI2 * 0.0147 * i + 2.1) * 0.34;
        const c = Math.sin(PI2 * 0.0021 * i + 4.0) * 0.18;
        out[i] = clamp(a + b + c, -0.95, 0.95);
    }
    return out;
}

// 부호가 바뀌는 표본 사이를 직선으로 이어 영점 교차의 화면 x 를 구한다
function zeroCrossings(sig: Float32Array): number[] {
    const xs: number[] = [];
    for (let i = 0; i < sig.length - 1; i += 1) {
        const a = sig[i];
        const b = sig[i + 1];
        if ((a < 0 && b >= 0) || (a >= 0 && b < 0)) {
            xs.push((i + a / (a - b)) / (sig.length - 1) * W);
        }
    }
    return xs;
}

// 놓은 자리 x 에서 반경 안의 가장 가까운 영점 교차로 — 없으면 제자리
function snapTarget(x: number, crossings: number[], radius: number): number {
    let best = x;
    let bestD = radius + 0.0001;
    for (let i = 0; i < crossings.length; i += 1) {
        const d = Math.abs(crossings[i] - x);
        if (d < bestD) {
            bestD = d;
            best = crossings[i];
        }
    }
    return best;
}

function makeTrimScene(h: Host): Scene {
    const sig = lowSignal(SAMPLE_N);
    const cross = zeroCrossings(sig);
    const hx = [START_A, START_B];
    const tx = [START_A, START_B];
    const els: HTMLElement[] = [];
    const nodes = h.root.querySelectorAll('[data-role="handle"]');
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        if (node instanceof HTMLElement) { els.push(node); }
    }
    let active = -1;
    let k = 0;
    let fakeX = 200;
    let fakeY = 210;
    let fakeDown = false;
    let lastPull = -1;
    let msg = '';
    function limit(i: number, x: number): number {
        return i === 0 ? clamp(x, 0, hx[1] - MIN_SPAN) : clamp(x, hx[0] + MIN_SPAN, W);
    }
    function release(i: number): void {
        const want = limit(i, snapTarget(hx[i], cross, SNAP_RADIUS));
        lastPull = Math.abs(want - hx[i]);
        tx[i] = want;
        if (h.reduce) { hx[i] = want; }
        msg = lastPull < 0.05 ? TXT_STAY : TXT_SNAP + ': ' + lastPull.toFixed(1) + ' px';
    }
    function nextCross(i: number, dir: number): void {
        let best = hx[i];
        let found = false;
        for (let c = 0; c < cross.length; c += 1) {
            const x = cross[c];
            if (dir > 0 && x > hx[i] + 0.5 && (!found || x < best)) { best = x; found = true; }
            if (dir < 0 && x < hx[i] - 0.5 && (!found || x > best)) { best = x; found = true; }
        }
        tx[i] = limit(i, best);
        if (h.reduce) { hx[i] = tx[i]; }
    }
    for (let i = 0; i < els.length && i < 2; i += 1) {
        const el = els[i];
        const idx = i;
        h.listen(el, 'pointerdown', function (e: Event): void {
            const pe = e as PointerEvent;
            active = idx;
            el.setPointerCapture(pe.pointerId);
            h.touch();
        });
        h.listen(el, 'pointermove', function (e: Event): void {
            if (active !== idx) { return; }
            const x = limit(idx, h.local(e as PointerEvent)[0]);
            hx[idx] = x;
            tx[idx] = x;
            h.refresh();
        });
        const up = function (): void {
            if (active !== idx) { return; }
            active = -1;
            release(idx);
            h.refresh();
        };
        h.listen(el, 'pointerup', up);
        h.listen(el, 'pointercancel', up);
        h.listen(el, 'keydown', function (e: Event): void {
            const key = (e as KeyboardEvent).key;
            if (key === 'ArrowLeft' || key === 'ArrowRight') {
                e.preventDefault();
                nextCross(idx, key === 'ArrowRight' ? 1 : -1);
                h.touch();
                h.refresh();
            }
        });
    }
    function script(): void {
        const j = k % SCRIPT_LEN;
        fakeDown = false;
        if (j === 0) {
            hx[0] = START_A; tx[0] = START_A; hx[1] = START_B; tx[1] = START_B;
        }
        if (j < 20) {
            fakeX = lerp(200, START_A, smooth(j / 20));
            fakeY = lerp(210, MID_Y, smooth(j / 20));
        }
        else if (j < 60) {
            fakeDown = true;
            const x = lerp(START_A, 103.5, smooth((j - 20) / 40));
            hx[0] = limit(0, x);
            tx[0] = hx[0];
            fakeX = hx[0];
            fakeY = MID_Y;
            if (j === 59) { release(0); }
        }
        else if (j < 110) {
            fakeX = lerp(hx[0], START_B, smooth((j - 60) / 50));
        }
        else if (j < 150) {
            fakeDown = true;
            const x = lerp(START_B, 329, smooth((j - 110) / 40));
            hx[1] = limit(1, x);
            tx[1] = hx[1];
            fakeX = hx[1];
            if (j === 149) { release(1); }
        }
        else if (j < 200) {
            fakeX = lerp(tx[1], 250, smooth((j - 150) / 50));
            fakeY = lerp(MID_Y, 214, smooth((j - 150) / 50));
        }
    }
    return {
        step(): void {
            k += 1;
            if (h.auto()) { script(); }
            for (let i = 0; i < 2; i += 1) {
                if (active === i || (h.auto() && fakeDown && ((k % SCRIPT_LEN) < 60 ? i === 0 : i === 1))) { continue; }
                const d = tx[i] - hx[i];
                hx[i] = Math.abs(d) < 0.05 ? tx[i] : hx[i] + d * SNAP_EASE;
            }
        },
        draw(): void {
            const ctx = h.ctx;
            ctx.fillStyle = rgba(CREAM, 1);
            ctx.fillRect(0, 0, W, H);
            const a = hx[0];
            const b = hx[1];
            // 선택 구간 바탕
            ctx.fillStyle = rgba(MINT, 0.38);
            ctx.fillRect(a, 40, b - a, 196);
            // 흡착 반경 띠 — 끌고 있는 손잡이 둘레
            const grabbed = active >= 0 ? active : (h.auto() && fakeDown ? ((k % SCRIPT_LEN) < 60 ? 0 : 1) : -1);
            if (grabbed >= 0) {
                ctx.fillStyle = rgba(LILAC, 0.34);
                ctx.fillRect(hx[grabbed] - SNAP_RADIUS, 40, SNAP_RADIUS * 2, 196);
            }
            ctx.fillStyle = rgba(INK, 0.28);
            ctx.fillRect(0, MID_Y, W, 1);
            // 파형
            ctx.beginPath();
            for (let i = 0; i < SAMPLE_N; i += 4) {
                const x = i / (SAMPLE_N - 1) * W;
                const y = MID_Y - sig[i] * HALF_Y;
                if (i === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
            }
            ctx.strokeStyle = rgba(INK, 0.9);
            ctx.lineWidth = 2;
            ctx.stroke();
            // 영점 교차 표시
            for (let i = 0; i < cross.length; i += 1) {
                ctx.beginPath();
                ctx.arc(cross[i], MID_Y, 3, 0, PI2);
                ctx.fillStyle = (cross[i] >= a - 0.5 && cross[i] <= b + 0.5) ? rgba(PINK, 1) : rgba(LILAC, 1);
                ctx.fill();
            }
            // 손잡이
            for (let i = 0; i < 2; i += 1) {
                const x = hx[i];
                ctx.fillStyle = rgba(INK, 0.95);
                ctx.fillRect(x - 1, 40, 2, 196);
                ctx.beginPath();
                ctx.roundRect(x - HANDLE_W / 2, 118, HANDLE_W, 40, 4);
                ctx.fillStyle = rgba(PINK, 1);
                ctx.fill();
                ctx.strokeStyle = rgba(INK, 0.95);
                ctx.lineWidth = 1.5;
                ctx.stroke();
                const el = els[i];
                if (el) {
                    el.style.left = (x / W * 100).toFixed(2) + '%';
                    const v = String(Math.round(x / W * (SAMPLE_N - 1)));
                    if (el.getAttribute('aria-valuenow') !== v) { el.setAttribute('aria-valuenow', v); }
                }
            }
            if (h.auto() && !h.reduce) { drawCursor(ctx, fakeX, fakeY, fakeDown); }
            h.say(msg !== '' && (active < 0) ? msg : TXT_SPAN + ': ' + Math.round((b - a) / W * SAMPLE_N));
        }
    };
}

export default function WfTrimHandleZeroCrossSnap() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return boot(root, makeTrimScene);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={`${styles.wf} is-demo`} ref={rootRef}>
        <canvas className={styles.canvas} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="자를 구간의 손잡이가 가장 가까운 영점 교차로 끌려가 붙는 구간 선택기" />
        <div className={styles.handle} data-role="handle" role="slider" tabIndex={0} aria-label="시작 손잡이" aria-valuemin={0} aria-valuemax={1919} aria-valuenow={221} style={{ left: "11.54%" }} />
        <div className={styles.handle} data-role="handle" role="slider" tabIndex={0} aria-label="끝 손잡이" aria-valuemin={0} aria-valuemax={1919} aria-valuenow={1694} style={{ left: "88.25%" }} />
        <p className={styles.status} data-role="status" aria-live="polite">선택 길이</p>
        <button className={styles.btn} data-role="btn" type="button">멈춤</button>
        <p className={styles.caption}>자를 구간의 손잡이가 가장 가까운 영점 교차로 끌려가 붙는 구간 선택기</p>
      </div>
    </main>
  );
}
