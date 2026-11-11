// MeshingTextRings - 같은 항목 vanilla 판 index.html 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./MeshingTextRings.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function MeshingTextRings() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    // 판 좌표 — 캔버스 안은 늘 480×300. 화면에 보이는 크기와 상관없이 계산은 이 좌표로 한다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // 따라가기 비율 — 1 − e^(−rate·dt). 프레임 시간이 달라도 1초에 같은 만큼 다가간다
    function follow(rate: number, dt: number): number { return 1 - Math.exp(-rate * dt); }
    // 1/60초마다 ease 만큼 다가가는 비율을 dt 초로 환산 — 1 − (1 − ease)^(dt × 60)
    function easeStep(ease: number, dt: number): number { return 1 - Math.pow(1 - ease, dt * 60); }
    // 시드 고정 난수 — 같은 시드면 같은 시연이 다시 나온다 (32비트 정수 섞기)
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
    function deg(rad: number): number { return rad * 180 / Math.PI; }

    // ── 감쇠 스프링 ──────────────────────────────────────────────
    // 가속 = 단단함 × (목표 − 위치) − 감쇠 × 속도. 속도를 먼저 고친 뒤 위치를 옮기는 적분을 1/240초 잔걸음으로 나눠 돌린다
    type Spring = { x: number; v: number; to: number };
    function makeSpring(x: number): Spring { return { x: x, v: 0, to: x }; }
    const SPRING_SUBSTEP = 1 / 240;
    function stepSpring(s: Spring, stiffness: number, damping: number, dt: number): void {
        let left = dt;
        while (left > 1e-9) {
            const h = Math.min(SPRING_SUBSTEP, left);
            s.v += (stiffness * (s.to - s.x) - damping * s.v) * h;
            s.x += s.v * h;
            left -= h;
        }
    }
    function snapSpring(s: Spring, x: number): void { s.x = x; s.v = 0; s.to = x; }

    // ── 글자 폭 ──────────────────────────────────────────────────
    // 글자 하나의 가로 폭(px) — 글꼴 크기 px, 굵기 weight. 화면에서는 캔버스 measureText 로 잰 값으로 바뀐다(dom 쪽).
    // 아래 대략 모형은 재기 전 자리 채움일 뿐 — 글자 폭은 반드시 글꼴이 다 온 뒤 다시 잰다
    type Measure = (ch: string, px: number, weight: number) => number;
    function roughWidth(ch: string, px: number, weight: number): number {
        const wide = ch.charCodeAt(0) >= 0x1100;
        const base = ch === ' ' ? 0.28 : (wide ? 0.95 : 0.6);
        return px * base * (weight >= 700 ? 1.06 : 1);
    }
    // 글꼴이 다 온 뒤 잰 폭
    let glyphWidth: Measure = roughWidth;
    // 대체 글꼴로 잰 폭 — 09 가 「글꼴이 오기 전에 잰 폭」 을 흉내 낼 때만 쓴다
    let fallbackWidth: Measure = roughWidth;
    // 글자 나누기 — 한 글자씩(서로게이트 쌍도 한 글자)
    function glyphsOf(s: string): string[] { return Array.from(s); }
    function widthsOf(gs: string[], px: number, weight: number, m: Measure): number[] {
        return gs.map(function (g: string): number { return m(g, px, weight); });
    }
    function sum(xs: number[]): number { let s = 0; for (const x of xs) { s += x; } return s; }

    // ── 원 위에 글자 놓기 ────────────────────────────────────────
    // 글자 i 의 각 = 가운데 각 + 방향 × (앞 글자 폭 합 + 자기 폭/2 − 전체/2) × 축소 / 놓는 반지름.
    // 놓는 반지름은 글자 높이의 inner 몫만큼 안쪽 — 글자 아래 모서리(원 중심 쪽)에서 폭이 맞으면 바깥은 저절로 벌어진다.
    // 전체 각이 span 을 넘으면 글꼴을 줄인다. 줄이면 글자 높이도 줄어 놓는 반지름이 커지므로
    // 축소 = span·r / (전체 폭 + span·inner·px) 로 한 번에 푼다 (전체 폭 × 축소 = span × (r − inner·px·축소))
    type ArcFit = { theta: number[]; px: number; scale: number; total: number; layR: number; need: number };
    function arcTotal(ws: number[], tracking: number): number { return sum(ws) + tracking * Math.max(0, ws.length - 1); }
    // 글꼴 축소 몫 — 줄이지 않아도 들어가면 1
    function arcScale(ws: number[], px: number, tracking: number, r: number, inner: number, span: number): number {
        const total = arcTotal(ws, tracking);
        const need = total / Math.max(1, r - inner * px);
        return need > span ? span * r / (total + span * inner * px) : 1;
    }
    function fitArc(ws: number[], px: number, tracking: number, r: number, inner: number, span: number, center: number, dir: number, allowShrink: boolean): ArcFit {
        return placeArc(ws, px, tracking, r, inner, allowShrink ? arcScale(ws, px, tracking, r, inner, span) : 1, center, dir);
    }
    // 정한 축소 몫으로 놓기 — 위·아래 반원이 같은 글꼴 크기를 쓰도록 둘 중 작은 몫을 넘겨받는다
    function placeArc(ws: number[], px: number, tracking: number, r: number, inner: number, scale: number, center: number, dir: number): ArcFit {
        const n = ws.length;
        const total = arcTotal(ws, tracking);
        const need = total / Math.max(1, r - inner * px);
        const layR = Math.max(1, r - inner * px * scale);
        const theta: number[] = [];
        let acc = 0;
        for (let i = 0; i < n; i += 1) {
            theta.push(center + dir * (acc + ws[i] / 2 - total / 2) * scale / layR);
            acc += ws[i] + tracking;
        }
        return { theta: theta, px: px * scale, scale: scale, total: total, layR: layR, need: need };
    }
    // 같은 각도로 놓기(비교판) — 폭은 보지 않고 전체 각을 글자 수로 똑같이 나눈다
    function equalArc(n: number, spanUsed: number, center: number, dir: number): number[] {
        const out: number[] = [];
        const step = spanUsed / Math.max(1, n);
        for (let i = 0; i < n; i += 1) { out.push(center + dir * (i + 0.5 - n / 2) * step); }
        return out;
    }
    // 이웃 두 글자가 글자 아래 모서리(반지름 r − 0.5·글자 높이)에서 겹친 길이(px). 양수면 부딪힌다.
    // 각 간격 × 아래 모서리 반지름 − 두 글자 반폭 합 이 음수인 만큼이 겹침
    const GLYPH_DROP = 0.5;
    function innerOverlaps(theta: number[], ws: number[], scale: number, r: number, px: number): number[] {
        const rin = r - GLYPH_DROP * px;
        const out: number[] = [];
        for (let i = 0; i + 1 < theta.length; i += 1) {
            const room = Math.abs(theta[i + 1] - theta[i]) * rin;
            out.push((ws[i] + ws[i + 1]) / 2 * scale - room);
        }
        return out;
    }

    // ── 곡선의 호 길이 표 ────────────────────────────────────────
    // 극좌표 곡선 r(θ) 의 호 길이 ds = √(r² + (dr/dθ)²) dθ 를 θ 의 작은 걸음 step 으로 더해 누적표를 만든다.
    // 거꾸로 「호 길이 s 인 자리의 θ」 는 표를 둘로 나눠 찾고 두 칸 사이를 곧게 잇는다
    type ArcTable = { th: number[]; s: number[] };
    function arcTable(rf: (th: number) => number, drf: (th: number) => number, th0: number, th1: number, step: number): ArcTable {
        const th: number[] = [th0];
        const s: number[] = [0];
        let acc = 0;
        const n = Math.max(1, Math.ceil((th1 - th0) / step));
        const h = (th1 - th0) / n;
        for (let i = 0; i < n; i += 1) {
            // 걸음 가운데의 값으로 더한다 — 걸음 끝 값보다 같은 걸음에서 오차가 작다
            const m = th0 + (i + 0.5) * h;
            const r = rf(m);
            const dr = drf(m);
            acc += Math.sqrt(r * r + dr * dr) * h;
            th.push(th0 + (i + 1) * h);
            s.push(acc);
        }
        return { th: th, s: s };
    }
    function thetaAt(t: ArcTable, s: number): number {
        const last = t.s.length - 1;
        if (s <= 0) { return t.th[0]; }
        if (s >= t.s[last]) { return t.th[last]; }
        let lo = 0;
        let hi = last;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (t.s[mid] <= s) { lo = mid; } else { hi = mid; }
        }
        const k = (s - t.s[lo]) / Math.max(1e-9, t.s[hi] - t.s[lo]);
        return lerp(t.th[lo], t.th[hi], k);
    }
    function arcLength(t: ArcTable): number { return t.s[t.s.length - 1]; }
    // 극좌표 곡선의 접선 각(화면 좌표, y 아래) — 점 (r cosθ, r sinθ) 을 θ 로 미분한 방향
    function tangentAngle(r: number, dr: number, th: number): number {
        return Math.atan2(dr * Math.sin(th) + r * Math.cos(th), dr * Math.cos(th) - r * Math.sin(th));
    }

    // 장면 시계(초)와 상태 줄 글자 — 장면 계산이 고치고, 화면 쪽이 읽어 그린다
    let sceneT = 0;
    let simStatus = '';
    // 파스텔 팔레트 — 크림 바탕 위 라벤더·민트·버터·산호. 글자는 진한 쪽으로 명도 차를 둔다
    const PAPER: RGB = [251, 247, 238];
    const PAPER_DIM: RGB = [241, 234, 220];
    const INK: RGB = [44, 38, 58];
    const INK_SOFT: RGB = [112, 104, 126];
    const CREAM: RGB = [255, 251, 242];
    const LAVENDER: RGB = [196, 182, 238];
    const MINT: RGB = [164, 218, 196];
    const BUTTER: RGB = [246, 224, 150];
    const CORAL: RGB = [244, 170, 152];
    const SKY: RGB = [170, 206, 238];
    const PINK: RGB = [244, 190, 212];
    const MINT_DEEP: RGB = [36, 116, 90];
    const CORAL_DEEP: RGB = [178, 66, 52];
    const VIOLET_DEEP: RGB = [84, 58, 160];
    const BROWN_DEEP: RGB = [104, 62, 40];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
    // 대체 글꼴 — 09 가 「글꼴이 오기 전에 잰 폭」 을 흉내 낼 때만 쓴다
    const FALLBACK_STACK = 'monospace';
    // 잰 폭은 100px 기준으로 한 번만 재 두고 크기에 비례해 쓴다. 글꼴이 새로 오면 통째로 비운다
    const widthCache: { [key: string]: number } = {};
    function measureWith(stack: string): Measure {
        return function (ch: string, px: number, weight: number): number {
            const key = stack + '|' + weight + '|' + ch;
            let w = widthCache[key];
            if (w === undefined) {
                ctx.font = weight + ' 100px ' + stack;
                w = ctx.measureText(ch).width;
                widthCache[key] = w;
            }
            return w * px / 100;
        };
    }
    function remeasure(): void {
        for (const k of Object.keys(widthCache)) { delete widthCache[k]; }
        glyphWidth = measureWith(FONT_STACK);
        fallbackWidth = measureWith(FALLBACK_STACK);
        relayout();
    }
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function clearStage(c: RGB): void {
        ctx.fillStyle = rgba(c, 1);
        ctx.fillRect(0, 0, W, H);
    }
    function setFont(px: number, weight: number, stack: string): void {
        ctx.font = weight + ' ' + px.toFixed(2) + 'px ' + stack;
    }
    function label(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        setFont(px, weight, FONT_STACK);
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 글자 하나를 (x, y) 가운데에 rot 라디안 돌려 찍는다. sx·sy 는 가로·세로 배율(음수 sx 는 거울)
    function glyphAt(ch: string, x: number, y: number, rot: number, px: number, weight: number, c: RGB, a: number, sx: number, sy: number): void {
        if (a <= 0.01 || px < 0.5) { return; }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.scale(sx, sy);
        setFont(px, weight, FONT_STACK);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    }
    // 기울인 글자 — 글자 자기 좌표에서 가로로 skew(라디안)만큼 민다(윗부분이 앞으로)
    function glyphLean(ch: string, x: number, y: number, rot: number, px: number, weight: number, c: RGB, a: number, skew: number): void {
        if (a <= 0.01 || px < 0.5) { return; }
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.transform(1, 0, -Math.tan(skew), 1, 0, 0);
        setFont(px, weight, FONT_STACK);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
    }
    // 원 위 글자 — 중심 (cx, cy), 반지름 r, 각 th. turn 은 글자를 원에 맞춰 세우는 각(위 반원 +π/2, 아래 반원 −π/2)
    function ringGlyph(ch: string, cx: number, cy: number, r: number, th: number, turn: number, px: number, weight: number, c: RGB, a: number): void {
        glyphAt(ch, cx + r * Math.cos(th), cy + r * Math.sin(th), th + turn, px, weight, c, a, 1, 1);
    }
    function roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
        const rr = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.arcTo(x + w, y, x + w, y + rr, rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
        ctx.lineTo(x + rr, y + h);
        ctx.arcTo(x, y + h, x, y + h - rr, rr);
        ctx.lineTo(x, y + rr);
        ctx.arcTo(x, y, x + rr, y, rr);
        ctx.closePath();
    }
    function fillRound(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        roundRectPath(x, y, w, h, r);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function disc(x: number, y: number, r: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function ring(x: number, y: number, r: number, width: number, c: RGB, a: number): void {
        if (r <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    // 그림자 — 떠 있는 높이 lift(0~1)가 클수록 멀리·흐리게·넓게 떨어진다
    function softShadow(x: number, y: number, r: number, lift: number): void {
        const off = 4 + 14 * lift;
        const g = ctx.createRadialGradient(x + off * 0.4, y + off, r * 0.6, x + off * 0.4, y + off, r * (1.05 + 0.25 * lift));
        g.addColorStop(0, rgba(INK, 0.26 - 0.14 * lift));
        g.addColorStop(1, rgba(INK, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x + off * 0.4, y + off, r * (1.05 + 0.25 * lift), 0, TAU);
        ctx.fill();
    }
    // 작은 알약 이름표
    function pill(s: string, x: number, y: number, bg: RGB, fg: RGB, a: number, px: number): void {
        setFont(px, 700, FONT_STACK);
        const w = ctx.measureText(s).width + px * 1.2;
        fillRound(x - w / 2, y - px * 0.85, w, px * 1.7, px * 0.85, bg, a);
        label(s, x, y + 0.5, fg, a, px, 700, 'center');
    }
    // 상태 줄 — 바뀔 때만 글자를 고친다
    let shownStatus = '';
    function pushStatus(): void {
        if (!statusEl || simStatus === shownStatus) { return; }
        shownStatus = simStatus;
        statusEl.textContent = simStatus;
    }
    // 05 — 맞닿아 톱니처럼 도는 두 글자 고리. 두 고리의 맞닿은 원(피치원)이 미끄러지지 않으려면 맞닿은 곳의 빠르기가 같아야 한다:
    // ω1·R1 = ω2·R2 = EDGE_SPEED, 방향은 반대. 글자는 이 한 칸(TOOTH_PITCH)에 하나 — 칸 수 n ≈ 2πR / TOOTH_PITCH 를 문구 글자 수의 배수로 정하고
    // 반지름을 n·TOOTH_PITCH / 2π 로 고쳐 두 고리의 칸 길이를 똑같이 맞춘다. 작은 고리는 맞닿은 곳에 이가 아니라 틈이 오도록 반 칸 돌려 둔다
    const BIG_TEXT = '주말 장터 · 손으로 만든 물건 · ';
    const SMALL_TEXT = '토요일 열 시 · ';
    const MESH_PX = 14;
    const MESH_WEIGHT = 800;
    const TOOTH_PITCH = 16;
    // 피치원 바로 안쪽에 글자 줄 — 피치원에서 글자 가운데까지
    const TEXT_INSET = 13;
    const BIG_R_WANT = 96;
    const SMALL_R_WANT = 54;
    const EDGE_SPEED = 60;
    const EDGE_STIFFNESS = 40;
    const EDGE_DAMPING = 10;
    const SPIN_UP_S = 0.2;
    const LOOP_S = 6;
    const STATUS_MESH = '맞닿은 곳 {v}px/s · 큰 고리 {a}°/s · 작은 고리 {b}°/s';
    type MeshRing = { slots: number; r: number; glyphs: string[]; turn: number };
    // 칸 수 = 문구 글자 수 × 되풀이 수(둘레가 바라는 반지름에 가장 가깝게) — 문구가 고리를 딱 맞게 한 바퀴 이상 돈다.
    // 반지름은 칸 수 × TOOTH_PITCH / 2π 로 고친다(두 고리의 칸 길이가 같아야 이가 맞물린다)
    function meshRing(text: string, rWant: number): MeshRing {
        const src = glyphsOf(text);
        const reps = Math.max(1, Math.round(TAU * rWant / (TOOTH_PITCH * src.length)));
        const slots = src.length * reps;
        const gs: string[] = [];
        for (let k = 0; k < slots; k += 1) { gs.push(src[k % src.length]); }
        return { slots: slots, r: slots * TOOTH_PITCH / TAU, glyphs: gs, turn: 0 };
    }
    const bigRing05 = meshRing(BIG_TEXT, BIG_R_WANT);
    const smallRing05 = meshRing(SMALL_TEXT, SMALL_R_WANT);
    const edge05 = makeSpring(0);
    // 큰 고리 중심과 작은 고리 중심 — 두 피치원이 맞닿게 중심 거리 = R1 + R2
    const BIG_CX = 186;
    const BIG_CY = 150;
    const SMALL_CX = BIG_CX + bigRing05.r + smallRing05.r;
    const SMALL_CY = BIG_CY;
    // 작은 고리의 처음 각 — 맞닿은 곳(각 π)에 칸 경계가 아니라 칸 가운데가 오게
    const SMALL_PHASE = Math.PI + Math.PI / smallRing05.slots;
    // 칸에 한 글자씩 가운데 맞춰 놓는다 — 칸 길이가 곧 글자 간격. 칸의 SLOT_FILL 몫보다 넓은 글자(영문 W·M 류)만 가로로 눌러 담는다
    const SLOT_FILL = 0.9;
    let bigSquash05: number[] = [];
    let smallSquash05: number[] = [];
    function squashOf(gs: string[]): number[] {
        return gs.map(function (g: string): number { return Math.min(1, TOOTH_PITCH * SLOT_FILL / Math.max(0.01, glyphWidth(g, MESH_PX, MESH_WEIGHT))); });
    }
    function relayout(): void {
        bigSquash05 = squashOf(bigRing05.glyphs);
        smallSquash05 = squashOf(smallRing05.glyphs);
    }
    function omegas05(v: number): [number, number] { return [v / bigRing05.r, v / smallRing05.r]; }
    function reset(): void {
        snapSpring(edge05, 0);
        bigRing05.turn = 0;
        smallRing05.turn = SMALL_PHASE;
    }
    function statusFor05(): void {
        const w = omegas05(edge05.x);
        simStatus = STATUS_MESH.replace('{v}', String(Math.round(edge05.x))).replace('{a}', String(Math.round(deg(w[0])))).replace('{b}', String(Math.round(deg(w[1]))));
    }
    function update(dt: number): void {
        edge05.to = sceneT >= SPIN_UP_S ? EDGE_SPEED : 0;
        stepSpring(edge05, EDGE_STIFFNESS, EDGE_DAMPING, dt);
        const w = omegas05(edge05.x);
        // 큰 고리는 시계 방향(+), 작은 고리는 반대(−) — 맞닿은 곳 두 표면이 같은 쪽(아래)으로 간다
        bigRing05.turn += w[0] * dt;
        smallRing05.turn -= w[1] * dt;
        statusFor05();
    }
    function restPose(): void {
        snapSpring(edge05, 0);
        bigRing05.turn = 0;
        smallRing05.turn = SMALL_PHASE;
        statusFor05();
    }
    // 05 화면 — 두 고리 바탕, 피치원 바깥의 이(칸 경계마다 둥근 돌기), 칸마다 글자 하나. 빨리 도는 쪽일수록 지나온 각에 잔상이 남는다
    const LABEL_RATIO = '각속도 비 = 반지름 비의 역수';
    function bindInput(signal: AbortSignal): void { void signal; }
    function meshDraw(m: MeshRing, cx: number, cy: number, face: RGB, ink: RGB, squash: number[], omega: number, dir: number): void {
        const slotA = TAU / m.slots;
        softShadow(cx, cy, m.r + 4, 0.25);
        disc(cx, cy, m.r, face, 1);
        // 이 — 칸 경계마다 피치원 밖으로 둥근 돌기
        for (let k = 0; k < m.slots; k += 1) {
            const a = m.turn + k * slotA;
            ctx.save();
            ctx.translate(cx + m.r * Math.cos(a), cy + m.r * Math.sin(a));
            ctx.rotate(a);
            fillRound(-2, -TOOTH_PITCH * 0.22, 7, TOOTH_PITCH * 0.44, 3, face, 1);
            ctx.restore();
        }
        // 칸마다 번갈아 옅은 띠 — 칸이 곧 이 하나라 도는 모습이 띠 전체에 보인다
        for (let k = 0; k < m.slots; k += 2) {
            const a = m.turn + k * slotA;
            ctx.beginPath();
            ctx.arc(cx, cy, m.r, a, a + slotA);
            ctx.arc(cx, cy, m.r - TEXT_INSET * 2, a + slotA, a, true);
            ctx.closePath();
            ctx.fillStyle = rgba(CREAM, 0.55);
            ctx.fill();
        }
        ring(cx, cy, m.r - TEXT_INSET * 2, 1.2, INK, 0.45);
        disc(cx, cy, m.r - TEXT_INSET * 2 - 1, CREAM, 1);
        const tr = m.r - TEXT_INSET;
        // 잔상 — 1.5 프레임(1.5/60초)에 도는 각씩 뒤로 두 장(1.5 · 3 프레임 뒤)
        for (let g = 2; g >= 0; g -= 1) {
            const back = -dir * g * omega / 60 * 1.5;
            const a = g === 0 ? 1 : clamp(omega * 0.25, 0, 0.45) * (1 - g / 3);
            if (a <= 0.02) { continue; }
            m.glyphs.forEach(function (ch: string, k: number): void {
                const th = m.turn + (k + 0.5) * slotA + back;
                glyphAt(ch, cx + tr * Math.cos(th), cy + tr * Math.sin(th), th + Math.PI / 2, MESH_PX, MESH_WEIGHT, ink, a, squash[k] || 1, 1);
            });
        }
    }
    function draw(): void {
        clearStage(PAPER);
        const w = omegas05(edge05.x);
        meshDraw(bigRing05, BIG_CX, BIG_CY, MINT, INK, bigSquash05, w[0], 1);
        meshDraw(smallRing05, SMALL_CX, SMALL_CY, BUTTER, BROWN_DEEP, smallSquash05, w[1], -1);
        label(bigRing05.slots + '', BIG_CX, BIG_CY - 8, INK, 1, 26, 800, 'center');
        label(Math.round(deg(w[0])) + '°/s', BIG_CX, BIG_CY + 16, INK_SOFT, 1, 11, 700, 'center');
        label(smallRing05.slots + '', SMALL_CX, SMALL_CY - 5, BROWN_DEEP, 1, 16, 800, 'center');
        label(Math.round(deg(w[1])) + '°/s', SMALL_CX, SMALL_CY + 10, INK_SOFT, 1, 9, 700, 'center');
        // 맞닿은 곳 — 두 표면이 같은 빠르기로 아래로 지나간다는 표시
        const cx = BIG_CX + bigRing05.r;
        disc(cx, BIG_CY, 3, CORAL_DEEP, 1);
        pill(LABEL_RATIO, 392, 30, CREAM, INK, 1, 10);
    }
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
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    // 한 프레임에 넘기는 시간 상한(초) — 탭을 오래 숨겼다 돌아온 첫 프레임에도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    // 장면 시계를 dt 만큼 — 한 바퀴(LOOP_S)를 넘으면 처음 배치로 되돌려 다시 시연한다
    function advance(dt: number): void {
        sceneT += dt;
        if (sceneT >= LOOP_S) {
            sceneT -= LOOP_S;
            reset();
        }
        update(dt);
    }
    let rafId = 0;
    let lastTs = -1;
    function frame(ts: number): void {
        if (still || paused) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
        lastTs = ts;
        if (dt > 0) { advance(dt); }
        draw();
        pushStatus();
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
    // 동작 줄이기 — 루프를 돌리지 않고 시연이 끝난 최종 배치 한 장만 그린다
    function showRest(): void {
        stopLoop();
        sceneT = 0;
        reset();
        restPose();
        draw();
        pushStatus();
    }
    function play(): void {
        sceneT = 0;
        reset();
        draw();
        pushStatus();
        if (!paused) { startLoop(); }
    }
    pauseBtn.addEventListener('click', function (): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }, { signal: off.signal });
    // 탭이 숨으면 루프를 멈추고, 돌아오면 시계를 다시 맞춰 시작한다 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still && fontsReady) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 페이지를 연 채 바뀌면 — 켜지면 최종 배치로 멈추고, 꺼지면 시연을 처음부터
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        draw();
    }, { signal: off.signal });
    bindInput(off.signal);
    fitCanvas();
    // 글자 폭은 글꼴이 다 온 뒤에 잰다 — 그 전에 잰 폭은 대체 글꼴의 폭이라 글꼴이 바뀌는 순간 자리가 틀어진다.
    // 나중에 다른 글꼴이 더 오면(loadingdone) 다시 잰다
    let fontsReady = false;
    document.fonts.addEventListener('loadingdone', function (): void {
        if (!fontsReady) { return; }
        remeasure();
        draw();
    }, { signal: off.signal });
    document.fonts.ready.then(function (): void {
        if (off.signal.aborted) { return; }
        fontsReady = true;
        remeasure();
        if (still) { showRest(); } else { play(); }
    });
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("cf") + " is-demo"} ref={rootRef}>
        <canvas className={cx("cf__canvas")} data-role="canvas" width={480} height={300} aria-hidden={true}></canvas>
        <p className={cx("cf__sr")}>{'주말 장터 · 손으로 만든 물건 — 토요일 열 시'}</p>
        <p className={cx("cf__status")} data-role="status" aria-live="off">{'두 고리를 맞물리는 중'}</p>
        <button className={cx("cf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
