// SingleStrokeFigureCheck - vanilla 판(07-oneline-single-stroke-figure-check) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./SingleStrokeFigureCheck.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SingleStrokeFigureCheck() {
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
    // 한붓그리기 도안 — 꼭짓점 좌표(x, y 번갈아)와 선(꼭짓점 번호 두 개씩)
    type Figure = { pts: number[]; edges: number[] };
    const FIGURES: Figure[] = [
        // 집 — 네모 + 대각선 둘(가운데 꼭짓점) + 지붕
        { pts: [160, 262, 320, 262, 320, 136, 160, 136, 240, 46, 240, 199], edges: [0, 1, 1, 2, 2, 3, 3, 0, 3, 4, 4, 2, 0, 5, 5, 2, 1, 5, 5, 3] },
        // 나비 리본 — 가운데 꼭짓점을 함께 쓰는 세모 둘
        { pts: [118, 66, 240, 150, 118, 234, 362, 66, 362, 234], edges: [0, 1, 1, 2, 2, 0, 1, 3, 3, 4, 4, 1] },
        // 봉투 — 네모 + 가운데에서 만나는 대각선 넷. 네 모서리가 모두 선 셋
        { pts: [140, 60, 340, 60, 340, 240, 140, 240, 240, 150], edges: [0, 1, 1, 2, 2, 3, 3, 0, 0, 4, 1, 4, 2, 4, 3, 4] },
        // 별 — 오각형 + 꼭짓점 하나 건너 잇는 별
        { pts: [240, 40, 345, 116, 305, 240, 175, 240, 135, 116], edges: [0, 1, 1, 2, 2, 3, 3, 4, 4, 0, 0, 2, 2, 4, 4, 1, 1, 3, 3, 0] },
    ];
    // 꼭짓점 차수 — 꼭짓점마다 이어진 선의 수
    function degrees(f: Figure): number[] {
        const deg: number[] = [];
        for (let i = 0; i < f.pts.length / 2; i += 1) { deg.push(0); }
        for (let e = 0; e < f.edges.length; e += 2) { deg[f.edges[e]] += 1; deg[f.edges[e + 1]] += 1; }
        return deg;
    }
    type StrokePlan = { possible: boolean; odd: number[]; order: number[]; splices: number };
    // 한 번에 그릴 순서 — 홀수 꼭짓점이 0개면 0 번에서, 2개면 그 하나에서 출발. 4개 이상이면 불가.
    // 갈 수 있는 동안 아직 안 쓴 선 가운데 목록에서 앞선 것을 따라가고(스택에 쌓기), 막다른 곳에서는 한 걸음씩 되돌아오며
    // 꺼낸 꼭짓점을 순서에 적는다. 되돌아온 자리에 남은 선이 있으면 거기서 다시 걸어 남은 고리를 순서 사이에 끼워 넣는다
    function planStroke(f: Figure): StrokePlan {
        const deg = degrees(f);
        const odd: number[] = [];
        for (let i = 0; i < deg.length; i += 1) { if (deg[i] % 2 === 1) { odd.push(i); } }
        if (odd.length > 2) { return { possible: false, odd: odd, order: [], splices: 0 }; }
        const used = new Uint8Array(f.edges.length / 2);
        const stack: number[] = [odd.length === 2 ? odd[0] : 0];
        const out: number[] = [];
        let splices = 0;
        let backing = false;
        while (stack.length > 0) {
            const v = stack[stack.length - 1];
            let next = -1;
            for (let e = 0; e < used.length; e += 1) {
                if (used[e]) { continue; }
                if (f.edges[2 * e] === v) { next = f.edges[2 * e + 1]; } else if (f.edges[2 * e + 1] === v) { next = f.edges[2 * e]; } else { continue; }
                used[e] = 1;
                break;
            }
            if (next >= 0) {
                // 되돌아오다가 다시 걷기 시작했다 = 남은 고리 하나를 끼워 넣는다
                if (backing) { splices += 1; backing = false; }
                stack.push(next);
            } else {
                out.push(stack.pop() as number);
                backing = true;
            }
        }
        // 꺼낸 순서를 뒤집으면 출발점에서 시작하는 한 번 그리기 순서
        out.reverse();
        return { possible: out.length === used.length + 1, odd: odd, order: out, splices: splices };
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
    // 07 한붓그리기 도안 넷 — 차수를 세고(COUNT_TIME), 그릴 수 있으면 찾은 순서대로 TRACE_SPEED 로 긋는다.
    // 홀수 꼭짓점이 넷인 봉투 도안은 긋지 않고 불가 표시를 IMPOSSIBLE_TIME 동안 보인다
    const COUNT_TIME = 0.45;
    const TRACE_SPEED = 520;
    const FIGURE_HOLD = 0.8;
    const IMPOSSIBLE_TIME = 1.8;
    // 도안이 바뀔 때 앞 도안이 옅어지는 시간(초)
    const FIGURE_FADE = 0.3;
    type FigureSlot = { plan: StrokePlan; deg: number[]; start: number; traceTime: number; end: number; lens: number[] };
    function edgeLen(f: Figure, a: number, b: number): number { return dist2(f.pts[2 * a], f.pts[2 * a + 1], f.pts[2 * b], f.pts[2 * b + 1]); }
    function makeSlots(): FigureSlot[] {
        const slots: FigureSlot[] = [];
        let t = 0;
        for (let k = 0; k < FIGURES.length; k += 1) {
            const f = FIGURES[k];
            const plan = planStroke(f);
            const lens: number[] = [];
            let total = 0;
            for (let i = 1; i < plan.order.length; i += 1) { total += edgeLen(f, plan.order[i - 1], plan.order[i]); lens.push(total); }
            const traceTime = plan.possible ? total / TRACE_SPEED : 0;
            const span = COUNT_TIME + (plan.possible ? traceTime + FIGURE_HOLD : IMPOSSIBLE_TIME) + FIGURE_FADE;
            slots.push({ plan: plan, deg: degrees(f), start: t, traceTime: traceTime, end: t + span, lens: lens });
            t += span;
        }
        return slots;
    }
    const slots07: FigureSlot[] = makeSlots();
    const CYCLE = slots07[slots07.length - 1].end;
    const START_AT = 0;
    // 동작 줄이기 — 첫 도안(집)을 다 그은 자리에서 멈춘다
    const FINISH_T = COUNT_TIME + slots07[0].traceTime + 0.2;
    let slotIndex = 0;
    let slotT = 0;
    function reset(): void { slotIndex = 0; slotT = 0; }
    function update(t: number, dt: number): void {
        slotIndex = 0;
        while (slotIndex < slots07.length - 1 && t >= slots07[slotIndex].end) { slotIndex += 1; }
        slotT = t - slots07[slotIndex].start;
    }
    // 순서 띠 색 — 몇 번째 선인지에 따라 파스텔을 돌려 쓴다
    const ORDER_COLORS: RGB[] = [LAVENDER, SKY, SAGE, BUTTER, PINK];
    function drawEdge(f: Figure, a: number, b: number, k: number, width: number, color: RGB, alpha: number): void {
        const ax = f.pts[2 * a];
        const ay = f.pts[2 * a + 1];
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(lerp(ax, f.pts[2 * b], k), lerp(ay, f.pts[2 * b + 1], k));
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(color, alpha);
        ctx.stroke();
    }
    function badge(x: number, y: number, r: number, fill: RGB, text: string): void {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(fill, 1);
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rgba(INK, 1);
        ctx.stroke();
        ctx.fillStyle = rgba(INK, 1);
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 0.5);
    }
    function draw(t: number): void {
        const slot = slots07[slotIndex];
        const f = FIGURES[slotIndex];
        const span = slot.end - slot.start;
        clearPaper();
        ctx.save();
        ctx.globalAlpha = 1 - smooth((slotT - (span - FIGURE_FADE)) / FIGURE_FADE);
        // 밑그림 — 도안의 선 전부를 옅게
        for (let e = 0; e < f.edges.length; e += 2) { drawEdge(f, f.edges[e], f.edges[e + 1], 1, 2, INK, 0.2); }
        const counted = smooth(slotT / COUNT_TIME);
        const traced = Math.max(0, slotT - COUNT_TIME) * TRACE_SPEED;
        if (slot.plan.possible) {
            const o = slot.plan.order;
            let prev = 0;
            for (let i = 1; i < o.length; i += 1) {
                const len = slot.lens[i - 1];
                if (traced <= prev) { break; }
                const k = clamp((traced - prev) / (len - prev), 0, 1);
                drawEdge(f, o[i - 1], o[i], k, 14, ORDER_COLORS[(i - 1) % ORDER_COLORS.length], 0.85);
                drawEdge(f, o[i - 1], o[i], k, 3, INK, 1);
                prev = len;
            }
            // 다 그은 선마다 가운데에 순서 번호
            prev = 0;
            for (let i = 1; i < o.length; i += 1) {
                if (traced < slot.lens[i - 1]) { break; }
                badge((f.pts[2 * o[i - 1]] + f.pts[2 * o[i]]) / 2, (f.pts[2 * o[i - 1] + 1] + f.pts[2 * o[i] + 1]) / 2, 9, PAPER, String(i));
            }
            if (traced > 0 && traced < slot.lens[slot.lens.length - 1]) {
                let i = 0;
                while (slot.lens[i] < traced) { i += 1; }
                const p0 = i === 0 ? 0 : slot.lens[i - 1];
                const k = (traced - p0) / (slot.lens[i] - p0);
                drawNib(lerp(f.pts[2 * o[i]], f.pts[2 * o[i + 1]], k), lerp(f.pts[2 * o[i] + 1], f.pts[2 * o[i + 1] + 1], k), CORAL);
            }
        } else if (slotT > COUNT_TIME) {
            // 불가 표시 — 도안 위에 산호색 엑스 도장. 홀수 꼭짓점 고리가 함께 뛴다
            const k = smooth((slotT - COUNT_TIME) / 0.35);
            ctx.lineCap = 'round';
            ctx.lineWidth = 12;
            ctx.strokeStyle = rgba(CORAL, 0.85 * k);
            ctx.beginPath();
            ctx.moveTo(150, 70);
            ctx.lineTo(330, 230);
            ctx.moveTo(330, 70);
            ctx.lineTo(150, 230);
            ctx.stroke();
        }
        // 꼭짓점과 차수 — 홀수 꼭짓점은 산호색 고리
        const deg = slot.deg;
        const pulse = slot.plan.possible ? 1 : 1 + 0.25 * Math.sin(slotT * 9);
        for (let v = 0; v < deg.length; v += 1) {
            const x = f.pts[2 * v];
            const y = f.pts[2 * v + 1];
            if (deg[v] % 2 === 1 && counted > 0) {
                ctx.beginPath();
                ctx.arc(x, y, 15 * counted * pulse, 0, TAU);
                ctx.fillStyle = rgba(CORAL, 0.9);
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, TAU);
            ctx.fillStyle = rgba(INK, 1);
            ctx.fill();
            if (counted > (v + 1) / (deg.length + 1)) { badge(x + 17, y - 15, 8, BUTTER, String(deg[v])); }
        }
        ctx.restore();
        if (slotT < COUNT_TIME) {
            setStatus('꼭짓점 세는 중');
        } else {
            setStatus((slot.plan.possible ? '한 번에 그릴 수 있음' : '한 번에 못 그림') + ' · ' + '홀수 점' + ' ' + slot.plan.odd.length);
        }
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
        <canvas className={cx("ld__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label="꼭짓점마다 이어진 선 수를 세어 한 번에 그릴 수 있는 도안은 순서 번호를 붙여 그리고 홀수 점이 넷인 도안에는 불가 표시를 하는 그림."></canvas>
        <p className={cx("ld__status")} data-role="status" aria-live="off">{'꼭짓점 세는 중'}</p>
        <button className={cx("ld__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
