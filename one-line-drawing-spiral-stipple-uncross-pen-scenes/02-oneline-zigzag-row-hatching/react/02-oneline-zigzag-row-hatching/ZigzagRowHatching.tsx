// ZigzagRowHatching - vanilla 판(02-oneline-zigzag-row-hatching) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./ZigzagRowHatching.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function ZigzagRowHatching() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type Pt = [number, number];
    type RGB = [number, number, number];
    // 점 묶음 — 좌표 두 배열과 점 수
    type Dots = { xs: Float32Array; ys: Float32Array; n: number };
    // 판 좌표 — 캔버스 안은 늘 480×300. 화면에 보이는 크기와 상관없이 계산은 이 좌표로 한다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 시드 고정 난수 — 같은 시드면 같은 점 배치·같은 떨림이 다시 나온다 (32비트 정수 섞기)
    function makeRng(seed: number): () => number {
        let s = seed >>> 0;
        return function (): number {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    // 1차원 값 노이즈 — 정수 자리마다 시드로 정한 값(-1~1)을 두고 사이는 부드러운 보간. 손 떨림에 쓴다
    const NOISE_TABLE = new Float32Array(256);
    const noiseRng = makeRng(483);
    for (let i = 0; i < 256; i += 1) { NOISE_TABLE[i] = noiseRng() * 2 - 1; }
    function smoothNoise(x: number): number {
        const i = Math.floor(x);
        const f = x - i;
        const u = f * f * (3 - 2 * f);
        return lerp(NOISE_TABLE[i & 255], NOISE_TABLE[(i + 1) & 255], u);
    }
    // 도형 거리 — 타원 안이면 음수, 밖이면 양수(px 에 가까운 근사). 원본 그림을 코드로 그릴 때 쓴다
    function ellipseDist(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        return (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry);
    }
    // 선분까지의 거리(px)
    function segmentDist(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
        const vx = bx - ax;
        const vy = by - ay;
        const k = clamp(((x - ax) * vx + (y - ay) * vy) / Math.max(1e-9, vx * vx + vy * vy), 0, 1);
        const ex = x - (ax + vx * k);
        const ey = y - (ay + vy * k);
        return Math.sqrt(ex * ex + ey * ey);
    }
    // 거리 → 칠한 정도 0~1. 경계 1px 를 부드럽게 넘긴다
    function fillOf(dist: number): number { return clamp(0.5 - dist, 0, 1); }
    // 두 점 사이 거리
    function dist2(ax: number, ay: number, bx: number, by: number): number {
        const dx = ax - bx;
        const dy = ay - by;
        return Math.sqrt(dx * dx + dy * dy);
    }
    // 꺾은선 길이 — xs·ys 를 order 순서로 이었을 때(닫지 않음)
    function pathLength(xs: Float32Array, ys: Float32Array, order: Int32Array, n: number): number {
        let sum = 0;
        for (let i = 1; i < n; i += 1) { sum += dist2(xs[order[i - 1]], ys[order[i - 1]], xs[order[i]], ys[order[i]]); }
        return sum;
    }
    // 파스텔 팔레트 — 미색 종이 바탕 위에 진한 잉크 선. 잉크·종이는 데모 토큰($subject-ink·$subject-cream)과 같은 값
    const PAPER: RGB = [255, 247, 230];
    const INK: RGB = [23, 20, 26];
    const CORAL: RGB = [244, 166, 150];
    const LAVENDER: RGB = [192, 176, 236];
    const BUTTER: RGB = [246, 224, 150];
    const SAGE: RGB = [164, 208, 172];
    const PINK: RGB = [244, 182, 204];
    const SKY: RGB = [164, 206, 236];
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    // 한 장면의 순환 — 그리기 → 머묾 → 지움. 지움이 끝나면 처음부터 다시
    function cyclePhase(t: number, drawTime: number, holdTime: number): number {
        // 0~1 은 그리는 중, 1~2 는 머무는 중, 2~3 은 지우는 중
        if (t < drawTime) { return t / drawTime; }
        if (t < drawTime + holdTime) { return 1 + (t - drawTime) / holdTime; }
        return 2 + (t - drawTime - holdTime) / ERASE_TIME;
    }
    // 지우기 시간(초) — 모든 장면이 같은 빠르기로 종이색으로 돌아간다
    const ERASE_TIME = 1;
    // 원본 그림 2 — 코드로 만든 김 나는 커피잔. 칸마다 어둡기 0~1. 외부 사진을 읽지 않는다
    function cupDark(x: number, y: number): number {
        let d = 0.03;
        // 받침 접시 — 테두리가 조금 더 어둡다
        const saucer = ellipseDist(x, y, 240, 248, 132, 22);
        d = Math.max(d, 0.4 * fillOf(saucer), 0.75 * fillOf(Math.abs(saucer) - 2));
        // 손잡이 — 바깥 반지름 24, 안 반지름 13 의 고리
        const hr = dist2(x, y, 306, 184);
        d = Math.max(d, 0.72 * fillOf(Math.abs(hr - 18.5) - 5.5));
        // 잔 몸통 — 아래로 갈수록 좁아지고, 왼쪽에 그늘
        const half = 66 - (y - 140) * 0.16;
        if (y > 140 && y < 236 && Math.abs(x - 240) < half) {
            d = Math.max(d, 0.42 + 0.34 * smooth((236 - x) / 70));
        }
        d = Math.max(d, 0.6 * fillOf(ellipseDist(x, y, 240, 234, 52, 9)));
        // 커피 면과 잔 입구 테두리, 가운데 우유 거품 하트(밝게)
        const rim = ellipseDist(x, y, 240, 140, 66, 14);
        d = Math.max(d, 0.92 * fillOf(Math.abs(rim) - 2.5));
        const coffee = ellipseDist(x, y, 240, 140, 58, 10);
        if (coffee < 0) {
            const hx = (x - 240) / 13;
            const hy = (y - 138) / 7;
            const heart = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * hy * hy * hy;
            d = Math.max(d, heart < 0 ? 0.22 : 0.95);
        }
        // 김 세 줄 — 위로 갈수록 흐려지는 물결
        for (let k = 0; k < 3; k += 1) {
            const sx = 212 + k * 28 + 7 * Math.sin(y / 11 + k * 2);
            if (y > 40 && y < 120) { d = Math.max(d, 0.55 * smooth((y - 40) / 50) * fillOf(Math.abs(x - sx) - 2.5)); }
        }
        return d;
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // 미색 종이 — 위는 조금 밝고 아래는 조금 따뜻하게
    function clearPaper(): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(PAPER, 1));
        g.addColorStop(1, rgba([250, 238, 216], 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    // 상태 줄 — 같은 글자면 DOM 을 건드리지 않는다
    let statusText = '';
    function setStatus(s: string): void {
        if (!statusEl || s === statusText) { return; }
        statusText = s;
        statusEl.textContent = s;
    }
    // 꺾은선 — xs·ys 의 0 번부터 count 개(소수 부분은 마지막 마디를 그만큼만)를 한 번에 긋는다
    function strokeRun(xs: Float32Array, ys: Float32Array, count: number, width: number, color: RGB, alpha: number): void {
        const whole = Math.floor(count);
        if (whole < 1) { return; }
        ctx.beginPath();
        ctx.moveTo(xs[0], ys[0]);
        const last = Math.min(whole, xs.length - 1);
        for (let i = 1; i <= last; i += 1) { ctx.lineTo(xs[i], ys[i]); }
        const f = count - whole;
        if (f > 0 && whole + 1 < xs.length) { ctx.lineTo(lerp(xs[whole], xs[whole + 1], f), lerp(ys[whole], ys[whole + 1], f)); }
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(color, alpha);
        ctx.stroke();
    }
    // 꺾은선 한 토막 — from 번째 꼭짓점부터 to 번째까지(to 의 소수 부분은 마지막 마디를 그만큼만)
    function strokeSpan(xs: Float32Array, ys: Float32Array, from: number, to: number, width: number, color: RGB, alpha: number): void {
        const end = Math.min(Math.floor(to), xs.length - 1);
        if (end <= from) { return; }
        ctx.beginPath();
        ctx.moveTo(xs[from], ys[from]);
        for (let i = from + 1; i <= end; i += 1) { ctx.lineTo(xs[i], ys[i]); }
        const f = to - Math.floor(to);
        if (f > 0 && end + 1 < xs.length) { ctx.lineTo(lerp(xs[end], xs[end + 1], f), lerp(ys[end], ys[end + 1], f)); }
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(color, alpha);
        ctx.stroke();
    }
    // 펜촉 — 지금 긋고 있는 자리. 잉크 점 둘레에 파스텔 고리
    function drawNib(x: number, y: number, ring: RGB): void {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, TAU);
        ctx.fillStyle = rgba(ring, 0.75);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, TAU);
        ctx.fillStyle = rgba(INK, 1);
        ctx.fill();
    }
    // 원본 그림 판 — 어둡기 함수(0~1)를 칸마다 칠한 화면 밖 캔버스. 펜이 그리기 전에 옅게 깔아 무엇을 따라 그리는지 보인다
    function makeSourceLayer(dark: (x: number, y: number) => number, tint: RGB): HTMLCanvasElement {
        const layer = document.createElement('canvas');
        layer.width = W;
        layer.height = H;
        const lc = layer.getContext('2d');
        if (!lc) { return layer; }
        const img = lc.createImageData(W, H);
        for (let y = 0; y < H; y += 1) {
            for (let x = 0; x < W; x += 1) {
                const d = dark(x + 0.5, y + 0.5);
                const o = (y * W + x) * 4;
                img.data[o] = Math.round(lerp(PAPER[0], tint[0], d));
                img.data[o + 1] = Math.round(lerp(PAPER[1], tint[1], d));
                img.data[o + 2] = Math.round(lerp(PAPER[2], tint[2], d));
                img.data[o + 3] = 255;
            }
        }
        lc.putImageData(img, 0, 0);
        return layer;
    }
    // 지우는 중이면 그림 전체를 종이색으로 덮어 간다 — phase 2~3 에서 덮개 불투명도 0→1
    function eraseVeil(phase: number): void {
        if (phase <= 2) { return; }
        ctx.fillStyle = rgba(PAPER, smooth(phase - 2));
        ctx.fillRect(0, 0, W, H);
    }
    // 02 지그재그 한 줄 음영 — 가로줄마다 방향을 바꿔 지나가며, 칸의 어둡기 d 로 위아래 폭(ZIG_AMP·d)과
    // 꺾이는 빠르기(ZIG_FREQ_LIGHT → ZIG_FREQ_DARK)를 정한다. 줄 끝은 반원으로 다음 줄에 이어 펜을 떼지 않는다
    const ROW_GAP = 10;
    const ZIG_AMP = 4.4;
    const ZIG_FREQ_LIGHT = 0.04;
    const ZIG_FREQ_DARK = 1.25;
    const ROW_LEFT = 22;
    const ROW_RIGHT = 458;
    const ROW_TOP = 18;
    // 반원을 몇 마디로 쪼개 긋는가
    const TURN_STEPS = 14;
    const DRAW_TIME = 5;
    const HOLD_TIME = 2;
    const CYCLE = DRAW_TIME + HOLD_TIME + ERASE_TIME;
    // 첫 화면이 비지 않게 잔 위쪽 줄까지 칠한 자리(2초)에서 시작한다 — 순환이 돌면 처음부터 다시 그린다
    const START_AT = 2;
    const FINISH_T = DRAW_TIME + 0.5;
    type Hatch = { xs: Float32Array; ys: Float32Array; rows: number; turnsPerRow: number[] };
    // 삼각파 — 위상 p 에서 -1~1 을 곧은 기울기로 오간다. 사인과 달리 꼭짓점이 뾰족해 「꺾임」 이 된다
    function triangleWave(p: number): number { return (2 / Math.PI) * Math.asin(Math.sin(p)); }
    function buildHatch(dark: (x: number, y: number) => number): Hatch {
        const xs: number[] = [];
        const ys: number[] = [];
        const turnsPerRow: number[] = [];
        let rows = 0;
        for (let ry = ROW_TOP; ry <= H - ROW_TOP; ry += ROW_GAP) {
            const dir = rows % 2 === 0 ? 1 : -1;
            let phase = 0;
            for (let k = 0; k <= ROW_RIGHT - ROW_LEFT; k += 1) {
                const x = dir > 0 ? ROW_LEFT + k : ROW_RIGHT - k;
                const d = dark(x, ry);
                phase += lerp(ZIG_FREQ_LIGHT, ZIG_FREQ_DARK, d);
                xs.push(x);
                ys.push(ry + ZIG_AMP * d * triangleWave(phase));
            }
            // 꺾임 수 — 삼각파는 위상 π 마다 한 번 방향을 바꾼다
            turnsPerRow.push(Math.floor(phase / Math.PI));
            rows += 1;
            if (ry + ROW_GAP > H - ROW_TOP) { break; }
            // 줄 끝 반원 — 지금 줄 끝에서 다음 줄 끝까지, 바깥쪽으로 부푼 반지름 ROW_GAP/2
            const ex = dir > 0 ? ROW_RIGHT : ROW_LEFT;
            const cy = ry + ROW_GAP / 2;
            for (let j = 1; j < TURN_STEPS; j += 1) {
                const a = -Math.PI / 2 + Math.PI * j / TURN_STEPS;
                xs.push(ex + dir * Math.cos(a) * ROW_GAP / 2);
                ys.push(cy + Math.sin(a) * ROW_GAP / 2);
            }
        }
        return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), rows: rows, turnsPerRow: turnsPerRow };
    }
    const hatch: Hatch = buildHatch(cupDark);
    let drawn = 0;
    function reset(): void { drawn = 0; }
    function update(t: number, dt: number): void {
        drawn = (hatch.xs.length - 1) * Math.min(1, t / DRAW_TIME);
    }
    // 원본 커피잔 판 — 그리기 시작에는 옅게 보였다가 지그재그가 다 덮을 무렵 사라진다
    const source02 = makeSourceLayer(cupDark, CORAL);
    function draw(t: number): void {
        const phase = cyclePhase(t, DRAW_TIME, HOLD_TIME);
        clearPaper();
        ctx.globalAlpha = 0.85 * (1 - smooth(Math.min(1, phase)));
        ctx.drawImage(source02, 0, 0, W, H);
        ctx.globalAlpha = 1;
        strokeRun(hatch.xs, hatch.ys, drawn, 2, INK, 1);
        if (phase < 1) {
            const i = Math.floor(drawn);
            drawNib(hatch.xs[i], hatch.ys[i], BUTTER);
        }
        eraseVeil(phase);
    }
    // 한 프레임에 넘기는 시간 상한(초) — 탭을 오래 숨겼다 돌아온 첫 프레임에도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    // 앞당겨 돌리기 걸음(초) — 시작 자리(START_AT)나 완성 판(FINISH_T)까지 1/60초씩 계산만 하고 그리지 않는다
    const SKIP_STEP = 1 / 60;
    // 장면 시계(초) — 순환 하나 안에서의 자리. CYCLE 을 넘으면 0 으로 돌아가 처음부터 다시 그린다
    let cycleT = 0;
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 처음 손대면 시연 표시를 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    // 리스너는 한 묶음으로 달고 정리할 때 한 번에 뗀다
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        const live = root.querySelector('[aria-live]');
        if (live) { live.setAttribute('aria-live', 'polite'); }
    }
    // 시계를 to 초까지 계산만 하고 넘긴다
    function skipTo(to: number): void {
        while (cycleT + SKIP_STEP <= to) {
            cycleT += SKIP_STEP;
            update(cycleT, SKIP_STEP);
        }
    }
    function advance(dt: number): void {
        cycleT += dt;
        if (cycleT >= CYCLE) {
            cycleT = 0;
            reset();
        }
        update(cycleT, dt);
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        draw(cycleT);
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 시계 다시 맞추기 — 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 동작 줄이기 — 루프를 돌리지 않고 다 그려진 한 장(FINISH_T)만 그린다
    function showFinished(): void {
        stopLoop();
        cycleT = 0;
        reset();
        skipTo(FINISH_T);
        draw(cycleT);
    }
    function play(): void {
        cycleT = 0;
        reset();
        skipTo(START_AT);
        draw(cycleT);
        if (!paused) { startLoop(); }
    }
    pauseBtn.addEventListener('click', function (): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }, { signal: off.signal });
    // 탭이 숨으면 루프를 멈추고, 돌아오면 시계를 다시 맞춰 이어 그린다 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 페이지를 연 채 바뀌면 — 켜지면 완성 판으로 멈추고, 꺼지면 시연을 처음부터
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showFinished(); } else { play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        draw(cycleT);
    }, { signal: off.signal });
    fitCanvas();
    if (still) { showFinished(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("ld") + " is-demo"} ref={rootRef}>
        <canvas className={cx("ld__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label="가로줄마다 좌우로 오가는 지그재그 한 줄이 어두운 곳에서 촘촘해지며 김이 나는 커피잔을 칠하는 그림."></canvas>
        <button className={cx("ld__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
