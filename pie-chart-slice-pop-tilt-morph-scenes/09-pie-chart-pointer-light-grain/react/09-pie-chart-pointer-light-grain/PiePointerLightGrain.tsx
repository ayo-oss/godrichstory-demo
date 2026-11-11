// PiePointerLightGrain - vanilla 판(09-pie-chart-pointer-light-grain) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PiePointerLightGrain.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PiePointerLightGrain() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    const TAU = Math.PI * 2;
    // 각도 원점 — 12시 방향에서 시계 방향으로 잰다 (캔버스는 y 가 아래로 커서 양의 각이 시계 방향)
    const TOP = -Math.PI / 2;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 조각을 얹어 명도 차로 경계가 읽힌다
    const BG: RGB = [29, 26, 44];
    const PANEL: RGB = [44, 39, 64];
    const PAPER: RGB = [255, 248, 234];
    const INK: RGB = [46, 38, 62];
    const PAL: RGB[] = [
        [124, 196, 255],
        [255, 160, 190],
        [126, 226, 192],
        [190, 164, 255],
        [255, 208, 168],
        [246, 228, 140],
        [150, 222, 236],
        [232, 182, 228],
        [196, 220, 160],
    ];
    // 가상 데이터의 이름 — 실제 항목이 아니라 순서만 뜻한다
    const LABELS = ['항목 A', '항목 B', '항목 C', '항목 D', '항목 E', '항목 F', '항목 G', '항목 H', '항목 I'];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function easeOutCubic(x: number): number { const c = 1 - clamp(x, 0, 1); return 1 - c * c * c; }
    // 앞뒤가 대칭인 거듭제곱 이징 — p 가 클수록 가운데에서 더 빨리 지나간다
    function easeInOutPow(x: number, p: number): number {
        const c = clamp(x, 0, 1);
        return c < 0.5 ? 0.5 * Math.pow(2 * c, p) : 1 - 0.5 * Math.pow(2 - 2 * c, p);
    }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !statusEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const status: HTMLElement = statusEl;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 처음 만지는 순간 시연을 멈추고 상태 줄을 읽어 주기 시작한다
    let demo = root.classList.contains('is-demo');
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        status.setAttribute('aria-live', 'polite');
    }
    function say(text: string): void {
        if (status.textContent !== text) { status.textContent = text; }
    }
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function onResize(): void {
        fitCanvas();
        draw();
    }
    fitCanvas();
    window.addEventListener('resize', onResize);
    // 화면 좌표(CSS px) → 장면 좌표(480x300). 리사이즈 뒤에도 늘 현재 크기로 다시 잰다
    function toScene(ev: PointerEvent): [number, number] {
        const r = cv.getBoundingClientRect();
        return [((ev.clientX - r.left) / r.width) * W, ((ev.clientY - r.top) / r.height) * H];
    }
    // 시드 고정 난수 — 같은 시드면 같은 가상 데이터가 다시 나온다 (32비트 정수 섞기)
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
    function seededValues(seed: number, n: number, lo: number, hi: number): number[] {
        const rnd = makeRng(seed);
        const out: number[] = [];
        for (let i = 0; i < n; i += 1) { out.push(lo + Math.floor(rnd() * (hi - lo + 1))); }
        return out;
    }
    type Slice = { value: number; share: number; a0: number; a1: number };
    // 숫자 목록 → 부채꼴 — 합계로 나눈 몫을 앞에서부터 쌓아 시작 각과 끝 각을 만든다
    function layout(values: number[]): Slice[] {
        let total = 0;
        for (let i = 0; i < values.length; i += 1) { total += values[i]; }
        const out: Slice[] = [];
        let acc = 0;
        for (let i = 0; i < values.length; i += 1) {
            const a0 = (acc / total) * TAU;
            acc += values[i];
            out.push({ value: values[i], share: values[i] / total, a0: a0, a1: (acc / total) * TAU });
        }
        return out;
    }
    function dirX(a: number): number { return Math.cos(TOP + a); }
    function dirY(a: number): number { return Math.sin(TOP + a); }
    // 포인터가 가리키는 각 — atan2 로 구한 화면 각을 12시 기준 0 ~ 2π 로 옮긴다
    function angleAt(x: number, y: number, cx: number, cy: number): number {
        let a = Math.atan2(y - cy, x - cx) - TOP;
        while (a < 0) { a += TAU; }
        while (a >= TAU) { a -= TAU; }
        return a;
    }
    function sliceAt(slices: Slice[], a: number): number {
        for (let i = 0; i < slices.length; i += 1) {
            if (a >= slices[i].a0 && a < slices[i].a1) { return i; }
        }
        return -1;
    }
    // 부채꼴 경로 — 안쪽 반지름 r0 이 0 이면 가운데 점까지, 아니면 도넛 조각
    function wedgePath(c: CanvasRenderingContext2D, cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): void {
        c.beginPath();
        c.arc(cx, cy, r1, TOP + a0, TOP + a1, false);
        if (r0 > 0.5) { c.arc(cx, cy, r0, TOP + a1, TOP + a0, true); } else { c.lineTo(cx, cy); }
        c.closePath();
    }
    function pctText(share: number): string { return (share * 100).toFixed(1) + '%'; }
    function sayPick(i: number, share: number): void { say(LABELS[i] + ' · ' + pctText(share)); }
    // 세 자리마다 쉼표 — 지역 설정에 기대지 않는다
    function groupDigits(n: number): string {
        const s = String(Math.round(Math.abs(n)));
        let out = '';
        for (let i = 0; i < s.length; i += 1) {
            if (i > 0 && (s.length - i) % 3 === 0) { out += ','; }
            out += s[i];
        }
        return (n < 0 ? '-' : '') + out;
    }
    // 왼쪽 범례 — 색 칩 + 이름 + 비율, 고른 줄은 밝게
    const LEG_X = 16;
    const LEG_Y = 100;
    const LEG_ROW = 16;
    function legendRow(row: number, label: string, value: string, c: RGB, on: boolean, dim: boolean): void {
        const y = LEG_Y + row * LEG_ROW;
        ctx.fillStyle = rgba(c, dim ? 0.3 : 1);
        ctx.fillRect(LEG_X, y - 9, 9, 9);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.font = (on ? '700' : '500') + ' 11px sans-serif';
        ctx.fillStyle = rgba(PAPER, on ? 1 : (dim ? 0.4 : 0.74));
        ctx.fillText(label, LEG_X + 15, y);
        ctx.textAlign = 'right';
        ctx.fillText(value, LEG_X + 132, y);
    }
    // 범례 아래 수치 한 줄 — 이름표 + 값
    function statRow(y: number, label: string, value: string): void {
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = rgba(PAPER, 0.6);
        ctx.font = '500 11px sans-serif';
        ctx.fillText(label, LEG_X, y);
        ctx.fillStyle = rgba(PAPER, 0.96);
        ctx.font = '700 14px sans-serif';
        ctx.fillText(value, LEG_X, y + 17);
    }
    function clearStage(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
    }
    // 시연 일정 — 루프 안의 시각(ms) 표를 지날 때마다 한 번씩 부른다
    let schedCycle = -1;
    let schedIdx = 0;
    function runSchedule(t: number, loop: number, marks: number[], fire: (k: number, cycle: number) => void): void {
        const cyc = Math.floor(t / loop);
        const p = t - cyc * loop;
        if (cyc !== schedCycle) { schedCycle = cyc; schedIdx = 0; }
        while (schedIdx < marks.length && p >= marks[schedIdx]) {
            fire(schedIdx, cyc);
            schedIdx += 1;
        }
    }
    // 빛의 높이(px) — 판 위 몇 px 에 떠 있나. 낮을수록 비스듬히 들어 밝고 어두운 차가 커진다
    const LIGHT_HEIGHT = 120;
    // 광택 지수 — 법선과 반벡터의 내적을 이만큼 거듭제곱한다. 클수록 반짝이는 점이 작고 날카롭다
    const GLOSS_POW = 28;
    // 결의 세기 — 시드 노이즈를 밝기에 ± 이만큼 더한다
    const GRAIN_AMT = 8;
    // 판 전체가 가운데로 부푸는 높이와 조각 가장자리가 둥글게 깎이는 폭(px)
    const DOME_PX = 14;
    const BEVEL_PX = 9;
    const SLICE_GAP = 2.4;
    const AMBIENT = 0.62;
    const SPEC_K = 0.8;
    const SLICE_N = 6;
    const SEED = 467;
    const CX = 316;
    const CY = 150;
    const R = 118;
    // 빛 계산 판 한 변 — 장면 1배 좌표에서 계산하고 화면에는 drawImage 로 올린다(배율이 2 여도 화소 수가 늘지 않는다)
    const BS = 248;
    const BX0 = CX - BS / 2;
    const BY0 = CY - BS / 2;
    const ORBIT_RX = 100;
    const ORBIT_RY = 72;
    const DEMO_LOOP = 2000;
    const TXT_LIGHT = '포인터를 빛 삼아 조각을 비추는 중';
    const orbitBtn = root.querySelector('[data-role="orbit"]') as HTMLButtonElement | null;
    const grainBtn = root.querySelector('[data-role="grain"]') as HTMLButtonElement | null;
    const slices: Slice[] = layout(seededValues(SEED, SLICE_N, 10, 36));
    const baseCv = document.createElement('canvas');
    const litCv = document.createElement('canvas');
    baseCv.width = BS;
    baseCv.height = BS;
    litCv.width = BS;
    litCv.height = BS;
    const bctxRaw = baseCv.getContext('2d');
    const lctxRaw = litCv.getContext('2d');
    if (!bctxRaw || !lctxRaw) { return; }
    const bctx: CanvasRenderingContext2D = bctxRaw;
    const lctx: CanvasRenderingContext2D = lctxRaw;
    const N = BS * BS;
    const baseRGB = new Float32Array(N * 3);
    const alpha = new Float32Array(N);
    const heightMap = new Float32Array(N);
    const normals = new Float32Array(N * 3);
    const grain = new Float32Array(N);
    const sliceId = new Int8Array(N);
    const outImg = lctx.createImageData(BS, BS);
    let grainSeed = SEED;
    let orbit = false;
    let orbitMs = 0;
    let pick = -1;
    let dirty = true;
    let toX = CX + ORBIT_RX;
    let toY = CY;
    let lightX = toX;
    let lightY = toY;
    // 굽기 1 — 평평한 색으로 조각을 그려 한 번 읽는다(getImageData 는 이 굽는 순간에만), 높이와 법선을 화소마다 저장한다
    function bakeSurface(): void {
        bctx.clearRect(0, 0, BS, BS);
        for (let i = 0; i < SLICE_N; i += 1) {
            bctx.fillStyle = rgba(PAL[i], 1);
            wedgePath(bctx, BS / 2, BS / 2, 0, R, slices[i].a0, slices[i].a1);
            bctx.fill();
        }
        const img = bctx.getImageData(0, 0, BS, BS).data;
        for (let p = 0; p < N; p += 1) {
            baseRGB[p * 3] = img[p * 4];
            baseRGB[p * 3 + 1] = img[p * 4 + 1];
            baseRGB[p * 3 + 2] = img[p * 4 + 2];
        }
        // 높이 — 판 전체가 가운데로 부푼 곡면 × 조각마다 가장자리가 둥글게 깎인 턱
        for (let y = 0; y < BS; y += 1) {
            for (let x = 0; x < BS; x += 1) {
                const p = y * BS + x;
                const px = x + 0.5 - BS / 2;
                const py = y + 0.5 - BS / 2;
                const r = Math.hypot(px, py);
                heightMap[p] = 0;
                alpha[p] = 0;
                sliceId[p] = -1;
                if (r > R) { continue; }
                const a = angleAt(px, py, 0, 0);
                let i = sliceAt(slices, a);
                if (i < 0) { i = SLICE_N - 1; }
                const s = slices[i];
                const da = Math.min(a - s.a0, s.a1 - a);
                // 가장자리까지 거리 — 바깥 호까지와 두 자른 선까지 중 가까운 쪽
                const dRad = da < Math.PI / 2 ? r * Math.sin(da) : r;
                const d = Math.min(R - r, dRad) - SLICE_GAP / 2;
                alpha[p] = clamp(d + 0.5, 0, 1);
                sliceId[p] = i;
                const bevel = d >= BEVEL_PX ? 1 : (d <= 0 ? 0 : Math.sqrt(1 - (1 - d / BEVEL_PX) * (1 - d / BEVEL_PX)));
                heightMap[p] = bevel * (BEVEL_PX + DOME_PX * (1 - (r / R) * (r / R)));
            }
        }
        // 법선 — 이웃 화소의 높이 차로 기울기를 재 (-∂h/∂x, -∂h/∂y, 1) 을 길이 1 로
        for (let y = 0; y < BS; y += 1) {
            for (let x = 0; x < BS; x += 1) {
                const p = y * BS + x;
                let gx = 0;
                let gy = 0;
                if (x > 0 && x < BS - 1 && y > 0 && y < BS - 1) {
                    gx = (heightMap[p + 1] - heightMap[p - 1]) / 2;
                    gy = (heightMap[p + BS] - heightMap[p - BS]) / 2;
                }
                const inv = 1 / Math.sqrt(gx * gx + gy * gy + 1);
                normals[p * 3] = -gx * inv;
                normals[p * 3 + 1] = -gy * inv;
                normals[p * 3 + 2] = inv;
            }
        }
        dirty = true;
    }
    // 굽기 2 — 결: 6px 격자 값 노이즈(부드러운 얼룩) 70% + 화소마다 시드 난수(잔 알갱이) 30%
    function bakeGrain(): void {
        const rnd = makeRng(grainSeed);
        const G = Math.ceil(BS / 6) + 2;
        const lattice = new Float32Array(G * G);
        for (let k = 0; k < G * G; k += 1) { lattice[k] = rnd() * 2 - 1; }
        for (let y = 0; y < BS; y += 1) {
            for (let x = 0; x < BS; x += 1) {
                const gx = x / 6;
                const gy = y / 6;
                const ix = Math.floor(gx);
                const iy = Math.floor(gy);
                const fx = smooth(gx - ix);
                const fy = smooth(gy - iy);
                const top = lerp(lattice[iy * G + ix], lattice[iy * G + ix + 1], fx);
                const bot = lerp(lattice[(iy + 1) * G + ix], lattice[(iy + 1) * G + ix + 1], fx);
                grain[y * BS + x] = lerp(top, bot, fy) * 0.7 + (rnd() * 2 - 1) * 0.3;
            }
        }
        dirty = true;
    }
    // 화소마다 빛 — 확산 = 법선·빛 방향 내적, 광택 = (법선·반벡터)^GLOSS_POW, 결은 그 위에 더한다
    function shade(): void {
        const o = outImg.data;
        const lx = lightX - BX0;
        const ly = lightY - BY0;
        for (let y = 0; y < BS; y += 1) {
            for (let x = 0; x < BS; x += 1) {
                const p = y * BS + x;
                const q = p * 4;
                const al = alpha[p];
                if (al <= 0) { o[q + 3] = 0; continue; }
                const nx = normals[p * 3];
                const ny = normals[p * 3 + 1];
                const nz = normals[p * 3 + 2];
                let vx = lx - x;
                let vy = ly - y;
                let vz = LIGHT_HEIGHT - heightMap[p];
                const inv = 1 / Math.sqrt(vx * vx + vy * vy + vz * vz);
                vx *= inv;
                vy *= inv;
                vz *= inv;
                const diff = Math.max(0, nx * vx + ny * vy + nz * vz);
                // 반벡터 — 빛 방향과 보는 방향(정면 0, 0, 1)의 가운데
                const hz = vz + 1;
                const hinv = 1 / Math.sqrt(vx * vx + vy * vy + hz * hz);
                const nh = Math.max(0, (nx * vx + ny * vy + nz * hz) * hinv);
                const spec = Math.pow(nh, GLOSS_POW) * SPEC_K * 255;
                // 확산 몫을 1.12 까지 열어 빛을 정면으로 받는 곳은 바탕색보다 조금 밝아진다
                const lit = (AMBIENT + (1.12 - AMBIENT) * diff) * (pick >= 0 && sliceId[p] === pick ? 1.12 : 1);
                const g = grain[p] * GRAIN_AMT;
                o[q] = baseRGB[p * 3] * lit + spec + g;
                o[q + 1] = baseRGB[p * 3 + 1] * lit + spec + g;
                o[q + 2] = baseRGB[p * 3 + 2] * lit + spec + g;
                o[q + 3] = 255 * al;
            }
        }
        lctx.putImageData(outImg, 0, 0);
        dirty = false;
    }
    function orbitTarget(ms: number): void {
        const a = (TAU * ms) / DEMO_LOOP;
        toX = CX + ORBIT_RX * Math.cos(a);
        toY = CY + ORBIT_RY * Math.sin(a);
    }
    function report(): void {
        if (pick >= 0) { sayPick(pick, slices[pick].share); } else { say(TXT_LIGHT); }
    }
    function step(): void {
        if (orbit) { orbitMs += FIXED_DT; orbitTarget(orbitMs); }
        const k = 1 - Math.exp((-12 * FIXED_DT) / 1000);
        const nx = lightX + (toX - lightX) * k;
        const ny = lightY + (toY - lightY) * k;
        if (Math.abs(nx - lightX) + Math.abs(ny - lightY) > 0.05) { dirty = true; }
        lightX = nx;
        lightY = ny;
    }
    function settle(): void {
        lightX = toX;
        lightY = toY;
        dirty = true;
    }
    function demoTick(t: number): void {
        if (t < 200) { return; }
        // 시연은 2초에 한 바퀴 — 빛을 바로 궤도 위에 놓아 루프가 이어진다
        orbitTarget(t - 200);
        lightX = toX;
        lightY = toY;
        dirty = true;
    }
    function draw(): void {
        if (dirty) { shade(); }
        clearStage();
        // 바닥 그림자 — 빛 반대쪽으로 조금 밀린 흐린 원
        const sx = CX - (lightX - CX) * 0.1;
        const sy = CY + 10 - (lightY - CY) * 0.1;
        const g = ctx.createRadialGradient(sx, sy, R * 0.6, sx, sy, R + 18);
        g.addColorStop(0, 'rgba(8,6,16,0.55)');
        g.addColorStop(1, 'rgba(8,6,16,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, R + 18, 0, TAU);
        ctx.fill();
        ctx.drawImage(litCv, BX0, BY0);
        const lg = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, 16);
        lg.addColorStop(0, 'rgba(255,248,234,0.95)');
        lg.addColorStop(1, 'rgba(255,248,234,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.arc(lightX, lightY, 16, 0, TAU);
        ctx.fill();
        for (let i = 0; i < SLICE_N; i += 1) { legendRow(i, LABELS[i], pctText(slices[i].share), PAL[i], i === pick, false); }
        statRow(212, '빛 높이 · 광택', String(LIGHT_HEIGHT) + ' px · ' + String(GLOSS_POW));
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function setOrbit(on: boolean): void {
        orbit = on;
        if (orbitBtn) { orbitBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
        // 움직임을 줄인 환경에서는 누를 때마다 궤도를 8분의 1 바퀴씩 옮긴다
        if (on && still) { orbitMs += DEMO_LOOP / 8; orbitTarget(orbitMs); }
    }
    function aimAt(i: number): void {
        const m = (slices[i].a0 + slices[i].a1) / 2;
        toX = CX + dirX(m) * R * 0.55;
        toY = CY + dirY(m) * R * 0.55;
    }
    function movePick(d: number): void {
        pick = pick < 0 ? (d > 0 ? 0 : SLICE_N - 1) : (pick + d + SLICE_N) % SLICE_N;
        setOrbit(false);
        aimAt(pick);
        dirty = true;
        after();
    }
    bakeSurface();
    bakeGrain();
    orbitTarget(0);
    lightX = toX;
    lightY = toY;
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        setOrbit(false);
        toX = p[0];
        toY = p[1];
        after();
    });
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        setOrbit(false);
        toX = p[0];
        toY = p[1];
        pick = Math.hypot(p[0] - CX, p[1] - CY) <= R ? sliceAt(slices, angleAt(p[0], p[1], CX, CY)) : -1;
        dirty = true;
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); movePick(1); }
        else if (ev.key === 'ArrowLeft') { ev.preventDefault(); wake(); movePick(-1); }
        else if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); wake(); setOrbit(!orbit); after(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); wake(); pick = -1; dirty = true; after(); }
    });
    if (orbitBtn) { orbitBtn.addEventListener('click', function (): void { wake(); setOrbit(!orbit); after(); }); }
    if (grainBtn) { grainBtn.addEventListener('click', function (): void { wake(); grainSeed += 1; bakeGrain(); after(); }); }
    report();

    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    let clock = 0;
    function frame(ts: number): void {
        if (lastTs < 0) { lastTs = ts; }
        // 탭이 숨었다 돌아와도 한 번에 100ms 까지만 따라잡는다 — 순간이동 대신 이어서 움직인다
        acc += Math.min(ts - lastTs, 100);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < 6) {
            clock += FIXED_DT;
            if (demo) { demoTick(clock); }
            step();
            acc -= FIXED_DT;
            n += 1;
        }
        draw();
        rafId = window.requestAnimationFrame(frame);
    }
    if (still) {
        settle();
        draw();
    } else {
        rafId = window.requestAnimationFrame(frame);
    }
    return function (): void {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
    };

  }, []);

  return (
    <div className={cx("pc") + " is-demo"} ref={rootRef}>
        <canvas className={cx("pc__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="포인터를 빛으로 삼아 조각마다 밝기와 광택이 바뀌는 원형 그래프. 포인터를 움직이거나 ←/→ 로 조각을 골라 빛을 옮긴다"></canvas>
        <p className={cx("pc__status")} data-role="status" aria-live="off">포인터를 빛 삼아 조각을 비추는 중</p>
        <div className={cx("pc__tools")}>
          <button className={cx("pc__btn")} data-role="orbit" type="button" aria-pressed="false">빛 돌리기</button>
          <button className={cx("pc__btn")} data-role="grain" type="button">결 다시 뿌리기</button>
        </div>
    </div>
  );
}
