// SilverLiningLight - 같은 항목 vanilla index.html 의 React 판. 같은 계산을 useEffect 안에서 돌린다
import { useEffect, useRef } from "react";
import styles from "./SilverLiningLight.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function SilverLiningLight() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    // 무대 좌표 — 캔버스 안 계산은 늘 480×300. 화면에 보이는 크기와 상관없다
    const W = 480;
    const H = 300;
    const TAU = Math.PI * 2;
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    // 0~1 사이를 3차로 부드럽게 — 양 끝에서 기울기 0
    function smooth01(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    // edge0 에서 0, edge1 에서 1 로 부드럽게 넘어가는 문턱
    function band(edge0: number, edge1: number, x: number): number { return smooth01((x - edge0) / (edge1 - edge0)); }
    function toRad(deg: number): number { return deg * Math.PI / 180; }
    // 시드 고정 난수 — 같은 시드면 같은 시연 (32비트 xorshift 에 곱셈 섞기 한 번)
    function seeded(seed: number): () => number {
        let s = (seed * 2654435761) >>> 0 || 1;
        return function (): number {
            s ^= s << 13; s >>>= 0;
            s ^= s >>> 17;
            s ^= s << 5; s >>>= 0;
            return (Math.imul(s, 0x9e3779b1) >>> 0) / 4294967296;
        };
    }

    // ── 노이즈 ──────────────────────────────────────────────────
    // 격자 꼭짓점마다 정수 해시로 0~1 값 하나 — 같은 (ix, iy, seed) 면 늘 같은 값
    function latticeValue(ix: number, iy: number, seed: number): number {
        let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1103515245)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    }
    // 값 노이즈 — 둘레 네 꼭짓점 값을 3차로 부드럽게 섞는다. 결과 0~1
    function valueNoise(x: number, y: number, seed: number): number {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = latticeValue(ix, iy, seed);
        const b = latticeValue(ix + 1, iy, seed);
        const c = latticeValue(ix, iy + 1, seed);
        const d = latticeValue(ix + 1, iy + 1, seed);
        return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
    }
    // 여러 겹 노이즈 합 — 겹마다 빈도 2배·세기 절반으로 octaves 겹을 더해 전체 세기 합으로 나눈다. 결과 0~1
    function layeredNoise(x: number, y: number, octaves: number, seed: number): number {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        let f = 1;
        for (let k = 0; k < octaves; k += 1) {
            sum += valueNoise(x * f, y * f, seed + k * 101) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2;
        }
        return sum / norm;
    }
    // 정수 나머지를 늘 0 이상으로
    function wrapIndex(i: number, n: number): number { const r = i % n; return r < 0 ? r + n : r; }
    // 주기 값 노이즈 — 가로 격자 번호를 period 로 나머지 처리해, x 가 period 만큼 가면 처음과 같은 값이 된다
    function periodicNoise(x: number, y: number, period: number, seed: number): number {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const x0 = wrapIndex(ix, period);
        const x1 = wrapIndex(ix + 1, period);
        const a = latticeValue(x0, iy, seed);
        const b = latticeValue(x1, iy, seed);
        const c = latticeValue(x0, iy + 1, seed);
        const d = latticeValue(x1, iy + 1, seed);
        return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
    }
    // 주기 여러 겹 노이즈 합 — 겹마다 빈도와 주기를 함께 2배로 해, 모든 겹이 같은 거리에서 한 바퀴를 돈다
    function periodicLayered(x: number, y: number, period: number, octaves: number, seed: number): number {
        let sum = 0;
        let amp = 1;
        let norm = 0;
        let f = 1;
        for (let k = 0; k < octaves; k += 1) {
            sum += periodicNoise(x * f, y * f, period * f, seed + k * 101) * amp;
            norm += amp;
            amp *= 0.5;
            f *= 2;
        }
        return sum / norm;
    }

    // ── 짙기 격자 ────────────────────────────────────────────────
    // 낮은 해상도 격자 한 장(가로 gw × 세로 gh 칸). 칸 하나 = 화면 W / gw px
    type Field = { gw: number; gh: number; v: Float32Array };
    function makeField(gw: number, gh: number): Field { return { gw: gw, gh: gh, v: new Float32Array(gw * gh) }; }
    // 칸 사이 값을 네 칸 섞어 읽는다 — 격자 밖은 0
    function sampleField(f: Field, x: number, y: number): number {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= f.gw - 1 || iy >= f.gh - 1) { return 0; }
        const fx = x - ix;
        const fy = y - iy;
        const i = iy * f.gw + ix;
        const a = f.v[i];
        const b = f.v[i + 1];
        const c = f.v[i + f.gw];
        const d = f.v[i + f.gw + 1];
        return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
    }
    // 구름 양 — 짙기가 level 을 넘는 칸의 몫(0~1)
    function coverOf(f: Field, level: number): number {
        let n = 0;
        for (let i = 0; i < f.v.length; i += 1) { if (f.v[i] > level) { n += 1; } }
        return n / f.v.length;
    }

    // ── 파스텔 팔레트 ────────────────────────────────────────────
    // 하늘·구름·땅은 파스텔, 구름 아랫면·그림자처럼 명도로 읽히는 것은 명도 차를 크게 둔다. 글자는 진한 INK
    const PAPER: RGB = [250, 246, 240];
    const INK: RGB = [40, 36, 54];
    const SKY_HIGH: RGB = [124, 160, 222];
    const SKY_LOW: RGB = [198, 216, 244];
    const CLOUD: RGB = [253, 251, 255];
    const CLOUD_SHADE: RGB = [142, 140, 182];
    const LAVENDER: RGB = [190, 176, 232];
    const PEACH: RGB = [250, 202, 172];
    const ROSE: RGB = [236, 168, 182];
    const BUTTER: RGB = [250, 226, 156];
    const MINT: RGB = [168, 214, 188];
    const GRASS: RGB = [160, 204, 146];
    const GRASS_SHADE: RGB = [76, 118, 98];
    const CORAL_DEEP: RGB = [176, 66, 54];
    const MINT_DEEP: RGB = [32, 110, 86];
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }

    // ── 상태 줄 낱말 ─────────────────────────────────────────────
    // 지금 하늘 — 구름 양(5% 단위)·해 높이(땅에서 잰 각, 도)·바람 방향. 숫자를 반올림해 글자가 매 프레임 바뀌지 않게
    function windName(dir: number): string {
        if (dir > 0) { return '오른쪽으로'; }
        if (dir < 0) { return '왼쪽으로'; }
        return '잔잔함';
    }
    function skyText(cover: number, sunDeg: number, windDir: number): string {
        return '구름 양 {c}% · 해 높이 {s}° · 바람 {w}'
            .replace('{c}', String(Math.round(clamp(cover, 0, 1) * 20) * 5))
            .replace('{s}', String(Math.round(sunDeg)))
            .replace('{w}', windName(windDir));
    }
    // 장면 시계(초) — 장면 계산이 고치고 화면 쪽이 읽는다
    let sceneT = 0;
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
    let dpr = 1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘지 않게
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // 낮은 해상도 화소 판 — 화면 밖 캔버스 하나와 ImageData 하나를 만들어 두고 매 프레임 다시 쓴다
    type Pix = { w: number; h: number; img: ImageData; c: HTMLCanvasElement; x: CanvasRenderingContext2D };
    function makePix(w: number, h: number): Pix {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const x = c.getContext('2d') as CanvasRenderingContext2D;
        return { w: w, h: h, img: x.createImageData(w, h), c: c, x: x };
    }
    // 화소 하나 쓰기(불투명)
    function putPx(p: Pix, i: number, c: RGB): void {
        const d = p.img.data;
        const k = i * 4;
        d[k] = c[0];
        d[k + 1] = c[1];
        d[k + 2] = c[2];
        d[k + 3] = 255;
    }
    // 판을 화면 자리 (dx, dy, dw, dh) 로 늘려 그린다 — 부드럽게 늘려 칸 경계가 보이지 않게
    function blit(p: Pix, dx: number, dy: number, dw: number, dh: number): void {
        p.x.putImageData(p.img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(p.c, dx, dy, dw, dh);
    }
    function fillAll(c: RGB): void {
        ctx.fillStyle = rgba(c, 1);
        ctx.fillRect(0, 0, W, H);
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
    function seg(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB, a: number, dash: number): void {
        if (a <= 0) { return; }
        ctx.beginPath();
        ctx.setLineDash(dash > 0 ? [dash, dash] : []);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    function box(x: number, y: number, w: number, h: number, r: number, c: RGB, a: number): void {
        if (w <= 0.2 || h <= 0.2 || a <= 0) { return; }
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.fillStyle = rgba(c, a);
        ctx.fill();
    }
    function frameBox(x: number, y: number, w: number, h: number, r: number, width: number, c: RGB, a: number): void {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
    }
    function text(s: string, x: number, y: number, c: RGB, a: number, px: number, weight: number, align: CanvasTextAlign): void {
        ctx.font = weight + ' ' + px + 'px ' + FONT_STACK;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, a);
        ctx.fillText(s, x, y);
    }
    // 글자 이름표 — 밝은 알약 위에 진한 글자
    function tag(s: string, x: number, y: number, fg: RGB, px: number, align: CanvasTextAlign): void {
        ctx.font = '700 ' + px + 'px ' + FONT_STACK;
        const w = ctx.measureText(s).width + px * 1.1;
        const left = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
        box(left, y - px * 0.82, w, px * 1.64, px * 0.82, PAPER, 0.92);
        text(s, left + w / 2, y + 0.5, fg, 1, px, 700, 'center');
    }
    // 위아래 두 색 하늘 — 화면 쪽 꾸밈 한 겹
    function skyGradient(top: RGB, bottom: RGB, y0: number, y1: number): void {
        const g = ctx.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, rgba(top, 1));
        g.addColorStop(1, rgba(bottom, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, y0, W, y1 - y0);
    }
    // 상태 줄 — 글자가 바뀔 때만 고친다
    let shownStatus = '';
    function pushStatus(s: string): void {
        if (!statusEl || s === shownStatus) { return; }
        shownStatus = s;
        statusEl.textContent = s;
    }
    // ── 02 해를 등진 구름의 은빛 테두리 ───────────────────────────
    // 같은 구름을 두 장(왼쪽 = 주변광 없음, 오른쪽 = 하늘 빛 하한) 나란히 — 짙기·빛 걸음은 한 번만 계산하고 색만 두 번 칠한다
    const PANEL_W = 240;
    const PANEL_H = 300;
    const GRID_W = 120;
    const GRID_H = 150;
    const CELL = PANEL_W / GRID_W;
    // 해 쪽 걸음 — 칸마다 해를 향해 LIGHT_STEPS 걸음(한 걸음 LIGHT_STEP_PX)을 걸으며 짙기 × LIGHT_STEP_FRAC 를 더해 S 를 만든다
    const LIGHT_STEPS = 6;
    const LIGHT_STEP_PX = 7;
    const LIGHT_STEP_FRAC = 0.45;
    // 지수로 깎이는 투과 — T = e^(−ABSORB × S). ABSORB 가 클수록 같은 짙기에서 빛이 빨리 줄어든다
    const ABSORB = 0.9;
    // 앞쪽 산란 — 시선과 해 방향의 코사인 c 에 대해 FORWARD_GAIN × c^FORWARD_POWER. 해 가까이 볼수록 얇은 곳이 밝아진다
    const FORWARD_POWER = 8;
    const FORWARD_GAIN = 1.2;
    // 해에서 바로 오는 빛의 기본 몫
    const BASE_LIGHT = 0.35;
    // 하늘 빛 하한 — 해가 다 깎여도 하늘 전체에서 받는 빛. 실패판(왼쪽)은 0
    const AMBIENT_LIGHT = 0.6;
    // 짙기가 화면에서 가리는 정도 — 불투명도 = 1 − e^(−짙기 × OPACITY)
    const OPACITY = 3.2;
    // 시선 모형 — 눈은 판 가운데 앞 FOCAL_PX 에 있다
    const FOCAL_PX = 200;
    // 해 자리(판 안 px) — 구름 오른쪽 위 뒤편
    const SUN_X = 168;
    const SUN_Y = 92;
    const SUN_DEG_02 = 9;
    // 노이즈 흐름 — 초당 노이즈 좌표를 이만큼 민다
    const DRIFT_X = 0.35;
    const DRIFT_Y = -0.1;
    const NOISE_SCALE_PX = 34;
    const LOOP_S = 0;
    const START_T = 2;
    const REST_T = 2;
    const dens02 = makeField(GRID_W, GRID_H);
    const trans02 = new Float32Array(GRID_W * GRID_H);
    // 구름 덩어리 모양 — 원 넷까지 거리의 최솟값(판 안 px, 안쪽 음수)
    const BLOB: number[][] = [[92, 176, 62], [140, 150, 58], [176, 190, 44], [60, 214, 40]];
    function blobDistance(x: number, y: number): number {
        let d = 1e9;
        for (const b of BLOB) { d = Math.min(d, Math.hypot(x - b[0], y - b[1]) - b[2]); }
        return d;
    }
    // 칸 (x, y) 의 짙기 — 덩어리 안쪽일수록 크고, 여러 겹 노이즈 합이 가장자리를 뜯어낸다
    function density02(x: number, y: number, t: number): number {
        const shape = 1 - band(-34, 26, blobDistance(x, y));
        const n = layeredNoise(x / NOISE_SCALE_PX + t * DRIFT_X, y / NOISE_SCALE_PX + t * DRIFT_Y, 4, 7);
        return clamp((shape * 1.15 + (n - 0.5) * 1.3 - 0.42) * 1.6, 0, 1);
    }
    function buildDensity(t: number): void {
        for (let gy = 0; gy < GRID_H; gy += 1) {
            for (let gx = 0; gx < GRID_W; gx += 1) {
                dens02.v[gy * GRID_W + gx] = density02((gx + 0.5) * CELL, (gy + 0.5) * CELL, t);
            }
        }
    }
    // 칸에서 해 쪽으로 걸어 모은 짙기 합 S(자기 칸 반 걸음 포함)
    function lightSum(gx: number, gy: number, steps: number): number {
        const x = (gx + 0.5) * CELL;
        const y = (gy + 0.5) * CELL;
        const dx = SUN_X - x;
        const dy = SUN_Y - y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len * LIGHT_STEP_PX / CELL;
        const uy = dy / len * LIGHT_STEP_PX / CELL;
        let s = dens02.v[gy * GRID_W + gx] * 0.5;
        for (let k = 1; k <= steps; k += 1) { s += sampleField(dens02, gx + ux * k, gy + uy * k); }
        return s * LIGHT_STEP_FRAC;
    }
    // 앞쪽 산란 몫 — 판 안 점 (x, y) 를 보는 시선과 해 쪽 시선의 코사인을 거듭제곱
    function forwardPhase(x: number, y: number): number {
        const vx = x - PANEL_W / 2;
        const vy = y - PANEL_H / 2;
        const sx = SUN_X - PANEL_W / 2;
        const sy = SUN_Y - PANEL_H / 2;
        const c = (vx * sx + vy * sy + FOCAL_PX * FOCAL_PX) / (Math.hypot(vx, vy, FOCAL_PX) * Math.hypot(sx, sy, FOCAL_PX));
        return FORWARD_GAIN * Math.pow(Math.max(0, c), FORWARD_POWER);
    }
    // 칸의 구름 밝기 — 해 빛 T × (기본 몫 + 앞쪽 산란) + 하늘 빛 하한
    function cloudLight(T: number, phase: number, ambient: number): number { return T * (BASE_LIGHT + phase) + ambient; }
    function buildLight(): void {
        for (let gy = 0; gy < GRID_H; gy += 1) {
            for (let gx = 0; gx < GRID_W; gx += 1) {
                const i = gy * GRID_W + gx;
                trans02[i] = dens02.v[i] > 0 ? Math.exp(-ABSORB * lightSum(gx, gy, LIGHT_STEPS)) : 1;
            }
        }
    }
    function reset(): void { /* 상태가 없다 — 짙기는 시각으로만 정해진다 */ }
    function update(dt: number): void { /* 시각만 흐른다 */ }
    // ── 02 화면 ──────────────────────────────────────────────────
    const pixFail02 = makePix(GRID_W, GRID_H);
    const pixFix02 = makePix(GRID_W, GRID_H);
    const DUSK_HIGH: RGB = [166, 156, 214];
    const DUSK_LOW: RGB = [250, 204, 176];
    const SUN_TINT: RGB = [255, 242, 224];
    const AMBIENT_TINT: RGB = [206, 194, 240];
    function paintPanel02(p: Pix, ambient: number): void {
        const d = p.img.data;
        for (let gy = 0; gy < GRID_H; gy += 1) {
            const sky = mix(DUSK_HIGH, DUSK_LOW, gy / GRID_H);
            for (let gx = 0; gx < GRID_W; gx += 1) {
                const i = gy * GRID_W + gx;
                const x = (gx + 0.5) * CELL;
                const y = (gy + 0.5) * CELL;
                const sunD = Math.hypot(x - SUN_X, y - SUN_Y);
                let c = mix(sky, SUN_TINT, clamp(1 - (sunD - 16) / 90, 0, 1) * 0.7);
                if (sunD < 16) { c = SUN_TINT; }
                const dv = dens02.v[i];
                if (dv > 0) {
                    const L = trans02[i] * (BASE_LIGHT + forwardPhase(x, y));
                    const cl: RGB = [
                        SUN_TINT[0] * L * 1.15 + AMBIENT_TINT[0] * ambient,
                        SUN_TINT[1] * L * 1.15 + AMBIENT_TINT[1] * ambient,
                        SUN_TINT[2] * L * 1.15 + AMBIENT_TINT[2] * ambient,
                    ];
                    c = mix(c, cl, 1 - Math.exp(-dv * OPACITY));
                }
                const k = i * 4;
                d[k] = clamp(c[0], 0, 255); d[k + 1] = clamp(c[1], 0, 255); d[k + 2] = clamp(c[2], 0, 255); d[k + 3] = 255;
            }
        }
    }
    function draw(): void {
        buildDensity(sceneT);
        buildLight();
        paintPanel02(pixFail02, 0);
        paintPanel02(pixFix02, AMBIENT_LIGHT);
        blit(pixFail02, 0, 0, PANEL_W, PANEL_H);
        blit(pixFix02, PANEL_W, 0, PANEL_W, PANEL_H);
        seg(PANEL_W, 0, PANEL_W, H, 2, PAPER, 0.9, 0);
        tag('주변광 없음', PANEL_W / 2, H - 22, CORAL_DEEP, 12, 'center');
        tag('하늘 빛 하한 {a}'.replace('{a}', String(AMBIENT_LIGHT)), PANEL_W + PANEL_W / 2, H - 22, MINT_DEEP, 12, 'center');
    }
    function statusText(): string { return skyText(coverOf(dens02, 0.1), SUN_DEG_02, 1); }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 움직임 줄이기 설정을 바꿔도 change 리스너가 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시 — 사람이 처음 버튼을 누르면 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    // 한 프레임에 넘기는 시간 상한(초) — 오래 숨었다 돌아온 첫 프레임도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    function advance(dt: number): void {
        sceneT += dt;
        if (LOOP_S > 0 && sceneT >= LOOP_S) {
            sceneT -= LOOP_S;
            reset();
        }
        update(dt);
    }
    // 처음부터 t 초까지 1/60초 고정 걸음으로 감아 둔다 — 첫 화면·정지 장면이 빈 하늘로 시작하지 않게
    function runTo(t: number): void {
        sceneT = 0;
        reset();
        const h = 1 / 60;
        while (sceneT + h <= t) { advance(h); }
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
        pushStatus(statusText());
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 멈췄던 사이의 시간을 첫 프레임 dt 로 넘기지 않는다
        lastTs = -1;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 움직임 줄이기 — 루프 없이 대표 순간(REST_T 초)의 하늘 한 장
    function showRest(): void {
        stopLoop();
        runTo(REST_T);
        draw();
        pushStatus(statusText());
    }
    // 자동 시연은 START_T 초 자리에서 시작한다(첫 화면에 장면 핵심이 보이게). LOOP_S 가 있는 장면은 한 바퀴를 돌면 0초부터
    function play(): void {
        runTo(START_T);
        draw();
        pushStatus(statusText());
        if (!paused) { startLoop(); }
    }
    pauseBtn.addEventListener('click', function (): void {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        wake();
        if (paused) { stopLoop(); } else if (!still) { startLoop(); }
    }, { signal: off.signal });
    // 탭이 숨으면 멈추고, 돌아오면 시계를 다시 맞춰 시작 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 바뀌면 — 켜지면 정지 장면, 꺼지면 다시 움직인다
    reduceQuery.addEventListener('change', function (): void {
        still = reduceQuery.matches;
        if (still) { showRest(); } else { play(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        draw();
    }, { signal: off.signal });
    fitCanvas();
    if (still) { showRest(); } else { play(); }
    return function (): void {
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("cl") + " is-demo"} ref={rootRef}>
        <canvas className={cx("cl__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label={'해 질 녘 해를 등진 같은 구름 두 장이 나란히 있고, 왼쪽은 주변광 없이 해를 등진 쪽이 거의 까맣게, 오른쪽은 하늘 빛 하한을 더해 속은 어둡고 얇은 가장자리만 하얗게 빛난다'}></canvas>
        <p className={cx("cl__status")} data-role="status" aria-live="off">{'하늘을 읽는 중'}</p>
        <button className={cx("cl__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
