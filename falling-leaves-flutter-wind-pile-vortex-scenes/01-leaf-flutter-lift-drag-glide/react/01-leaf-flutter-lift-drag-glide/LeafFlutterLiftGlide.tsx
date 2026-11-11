// LeafFlutterLiftGlide - vanilla 판(01-leaf-flutter-lift-drag-glide) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./LeafFlutterLiftGlide.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function LeafFlutterLiftGlide() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    type Pt = [number, number];
    // 잎 스프라이트 한 장 — 오프스크린 캔버스와, 판 좌표로 잰 반 변(기준 크기 SPRITE_SIZE 일 때)
    type Sprite = { cv: HTMLCanvasElement; half: number };
    const W = 480;
    const H = 300;
    // 시계 — rAF 타임스탬프를 쌓아 16ms 고정 스텝으로만 진행한다
    const FIXED_DT = 16;
    const STEP_S = FIXED_DT / 1000;
    // 한 프레임에 따라잡는 시간 상한(ms) — 숨었던 탭이 돌아와 첫 간격이 수 초여도 이만큼만 쌓는다
    const DT_MAX = 100;
    const MAX_STEPS = 6;
    const TAU = Math.PI * 2;
    // 파스텔 팔레트 — 옅은 하늘·크림 바탕 위에 잎을 얹고, 줄기·흙·그늘은 진한 쪽으로 명도 차를 둔다
    const SKY_TOP: RGB = [212, 230, 243];
    const SKY_LOW: RGB = [253, 245, 231];
    const CREAM: RGB = [255, 250, 241];
    const INK: RGB = [70, 54, 58];
    const BARK: RGB = [118, 88, 76];
    const BARK_DEEP: RGB = [82, 60, 54];
    const SOIL: RGB = [228, 208, 180];
    const SOIL_DEEP: RGB = [176, 146, 118];
    const APRICOT: RGB = [240, 166, 114];
    const PEACH: RGB = [246, 194, 156];
    const BUTTER: RGB = [238, 206, 110];
    const MAPLE: RGB = [222, 112, 98];
    const SAGE: RGB = [146, 182, 132];
    const LEAF_COLORS: RGB[] = [APRICOT, BUTTER, MAPLE, PEACH, SAGE];
    // 잎 모양 셋 — 0 둥근 잎 · 1 다섯 갈래 잎 · 2 길쭉한 잎. 윤곽은 꼭지 쪽이 x = −1, 끝이 x = +1 인 단위 좌표
    const LEAF_KINDS = 3;
    const OUTLINE_POINTS = 72;
    // 스프라이트는 기준 크기로 한 번만 그리고, 찍을 때는 크기 배율만 곱한다
    const SPRITE_SIZE = 48;
    const SPRITE_RES = 2;
    const CAPTION_FONT = '600 11px system-ui, sans-serif';
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }
    function mixRGB(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    // 시드 고정 난수 — 같은 시드면 같은 잎 배치·같은 바람이 다시 나온다 (32비트 정수 섞기)
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
    // 부드러운 2D 노이즈 — 정수 격자점마다 시드로 정한 값(−1~1)을 두고 칸 안은 3차 곡선으로 섞는다
    function makeNoise(seed: number): (x: number, y: number) => number {
        const rng = makeRng(seed);
        const perm = new Uint8Array(512);
        const vals = new Float32Array(256);
        for (let i = 0; i < 256; i += 1) { vals[i] = rng() * 2 - 1; perm[i] = i; }
        for (let i = 255; i > 0; i -= 1) {
            const j = Math.floor(rng() * (i + 1));
            const tmp = perm[i];
            perm[i] = perm[j];
            perm[j] = tmp;
        }
        for (let i = 0; i < 256; i += 1) { perm[i + 256] = perm[i]; }
        function corner(ix: number, iy: number): number { return vals[perm[(ix & 255) + perm[iy & 255]]]; }
        return function (x: number, y: number): number {
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            const fx = x - ix;
            const fy = y - iy;
            const u = fx * fx * (3 - 2 * fx);
            const v = fy * fy * (3 - 2 * fy);
            const top = lerp(corner(ix, iy), corner(ix + 1, iy), u);
            const low = lerp(corner(ix, iy + 1), corner(ix + 1, iy + 1), u);
            return lerp(top, low, v);
        };
    }
    // 잎 윤곽 — 사진 없이 곡선으로. 둘레를 OUTLINE_POINTS 점으로 나눈다
    function leafOutline(kind: number): Pt[] {
        const pts: Pt[] = [];
        for (let i = 0; i < OUTLINE_POINTS; i += 1) {
            const a = i / OUTLINE_POINTS * TAU;
            const c = Math.cos(a);
            const s = Math.sin(a);
            if (kind === 1) {
                // 다섯 갈래 — 반지름이 둘레를 따라 다섯 번 부풀었다 들어간다
                const r = 0.6 + 0.4 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.8);
                pts.push([r * c, r * s * 0.95]);
            } else if (kind === 2) {
                pts.push([c, 0.3 * s * (1 - 0.25 * c)]);
            } else {
                // 둥근 잎 — 꼭지 쪽이 넓고 끝으로 갈수록 좁아지는 물방울
                pts.push([c, 0.52 * s * (1 - 0.3 * c)]);
            }
        }
        return pts;
    }
    const OUTLINES: Pt[][] = [leafOutline(0), leafOutline(1), leafOutline(2)];
    // 잎맥 선분 — 가운데 맥 하나와 곁맥. 갈래 잎은 갈래 끝마다 하나
    function leafVeins(kind: number): [Pt, Pt][] {
        const out: [Pt, Pt][] = [];
        if (kind === 1) {
            const base: Pt = [-0.4, 0];
            for (let k = -2; k <= 2; k += 1) {
                const a = k * 0.4 * Math.PI;
                out.push([base, [Math.cos(a) * 0.86, Math.sin(a) * 0.82]]);
            }
            return out;
        }
        const halfW = kind === 2 ? 0.3 : 0.52;
        const taper = kind === 2 ? 0.25 : 0.3;
        out.push([[-1, 0], [0.92, 0]]);
        const roots = [-0.55, -0.15, 0.25, 0.6];
        for (let i = 0; i < roots.length; i += 1) {
            const x0 = roots[i];
            const x1 = Math.min(0.95, x0 + 0.32);
            const y1 = halfW * Math.sqrt(Math.max(0, 1 - x1 * x1)) * (1 - taper * x1) * 0.8;
            out.push([[x0, 0], [x1, y1]]);
            out.push([[x0, 0], [x1, -y1]]);
        }
        return out;
    }
    const VEINS: [Pt, Pt][][] = [leafVeins(0), leafVeins(1), leafVeins(2)];
    function leafPathOn(g: CanvasRenderingContext2D, kind: number, k: number): void {
        const pts = OUTLINES[kind];
        g.beginPath();
        g.moveTo(pts[0][0] * k, pts[0][1] * k);
        for (let i = 1; i < pts.length; i += 1) { g.lineTo(pts[i][0] * k, pts[i][1] * k); }
        g.closePath();
    }
    // 스프라이트 흐림 — 가로·세로 상자 평균을 두 번. 투명 가장자리가 검게 번지지 않게 알파를 곱한 값으로 섞는다
    function blurSprite(g: CanvasRenderingContext2D, side: number, r: number): void {
        const img = g.getImageData(0, 0, side, side);
        const d = img.data;
        const n = side * side;
        const buf = new Float32Array(n * 4);
        const tmp = new Float32Array(n * 4);
        for (let i = 0; i < n; i += 1) {
            const a = d[i * 4 + 3] / 255;
            buf[i * 4] = d[i * 4] * a;
            buf[i * 4 + 1] = d[i * 4 + 1] * a;
            buf[i * 4 + 2] = d[i * 4 + 2] * a;
            buf[i * 4 + 3] = d[i * 4 + 3];
        }
        const span = r * 2 + 1;
        for (let pass = 0; pass < 2; pass += 1) {
            for (let y = 0; y < side; y += 1) {
                for (let x = 0; x < side; x += 1) {
                    for (let ch = 0; ch < 4; ch += 1) {
                        let sum = 0;
                        for (let k = -r; k <= r; k += 1) { sum += buf[(y * side + clamp(x + k, 0, side - 1)) * 4 + ch]; }
                        tmp[(y * side + x) * 4 + ch] = sum / span;
                    }
                }
            }
            for (let y = 0; y < side; y += 1) {
                for (let x = 0; x < side; x += 1) {
                    for (let ch = 0; ch < 4; ch += 1) {
                        let sum = 0;
                        for (let k = -r; k <= r; k += 1) { sum += tmp[(clamp(y + k, 0, side - 1) * side + x) * 4 + ch]; }
                        buf[(y * side + x) * 4 + ch] = sum / span;
                    }
                }
            }
        }
        for (let i = 0; i < n; i += 1) {
            const a = buf[i * 4 + 3];
            const inv = a > 0.5 ? 255 / a : 0;
            d[i * 4] = buf[i * 4] * inv;
            d[i * 4 + 1] = buf[i * 4 + 1] * inv;
            d[i * 4 + 2] = buf[i * 4 + 2] * inv;
            d[i * 4 + 3] = a;
        }
        g.putImageData(img, 0, 0);
    }
    const spriteCache = new Map<string, Sprite>();
    // 함정 1 실물 계수 — 잎 경로를 실제로 그린 횟수(spriteBuilds)와 스프라이트를 찍은 횟수(leafBlits)
    let spriteBuilds = 0;
    let leafBlits = 0;
    // 같은 모양·같은 색·같은 흐림이면 한 번만 그린다. 뒷면은 크림을 섞은 옅은 색으로 따로 한 장
    function spriteFor(kind: number, color: RGB, blur: number): Sprite {
        const key = kind + '|' + color.join(',') + '|' + blur;
        const hit = spriteCache.get(key);
        if (hit) { return hit; }
        spriteBuilds += 1;
        const pad = 3 + Math.ceil(blur * 2);
        const side = Math.ceil((SPRITE_SIZE + pad * 2) * SPRITE_RES);
        const cvs = document.createElement('canvas');
        cvs.width = side;
        cvs.height = side;
        const sp: Sprite = { cv: cvs, half: side / SPRITE_RES / 2 };
        spriteCache.set(key, sp);
        const g = cvs.getContext('2d');
        if (!g) { return sp; }
        const k = SPRITE_SIZE * SPRITE_RES / 2;
        g.translate(side / 2, side / 2);
        // 꼭지
        g.beginPath();
        g.moveTo(-k * 0.95, 0);
        g.lineTo(-k * 1.18, k * 0.05);
        g.lineWidth = 1.6 * SPRITE_RES;
        g.strokeStyle = rgba(mixRGB(color, INK, 0.5), 1);
        g.stroke();
        leafPathOn(g, kind, k);
        g.fillStyle = rgba(color, 1);
        g.fill();
        g.lineWidth = 1.1 * SPRITE_RES;
        g.strokeStyle = rgba(mixRGB(color, INK, 0.38), 0.95);
        g.stroke();
        const veins = VEINS[kind];
        g.beginPath();
        for (let i = 0; i < veins.length; i += 1) {
            g.moveTo(veins[i][0][0] * k, veins[i][0][1] * k);
            g.lineTo(veins[i][1][0] * k, veins[i][1][1] * k);
        }
        g.lineWidth = 0.8 * SPRITE_RES;
        g.strokeStyle = rgba(mixRGB(color, INK, 0.3), 0.75);
        g.stroke();
        g.setTransform(1, 0, 0, 1, 0, 0);
        if (blur > 0) { blurSprite(g, side, Math.round(blur * SPRITE_RES)); }
        return sp;
    }
    function backColor(c: RGB): RGB { return mixRGB(c, CREAM, 0.5); }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    // 스프라이트 찍기 — 자리(x, y)·크기·회전, squash 는 잎 면이 돌아 보이는 세로 납작함(0~1)
    function blitLeaf(sp: Sprite, x: number, y: number, size: number, angle: number, squash: number, alpha: number): void {
        leafBlits += 1;
        const k = size / SPRITE_SIZE;
        ctx.save();
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(k, k * Math.max(0.06, squash));
        ctx.drawImage(sp.cv, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
        ctx.restore();
    }
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 중인가 — 사람이 처음 손대면 시연 표시를 뗀다
    let demo = root.classList.contains('is-demo');
    // 리스너는 한 묶음으로 달고 정리할 때 한 번에 뗀다
    const off = new AbortController();
    // 포인터 자리(판 좌표) — 판 밖이면 −1
    let hoverX = -1;
    let hoverY = -1;
    function fitCanvas(): void {
        // 배율은 2 에서 자른다 — 배율 3 기기에서 화소가 2.25배로 늘어 프레임마다 일이 그만큼 커지지 않게
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function clearSky(): void {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, rgba(SKY_TOP, 1));
        g.addColorStop(1, rgba(SKY_LOW, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }
    function drawGround(y: number): void {
        const g = ctx.createLinearGradient(0, y, 0, H);
        g.addColorStop(0, rgba(SOIL, 1));
        g.addColorStop(1, rgba(SOIL_DEEP, 1));
        ctx.fillStyle = g;
        ctx.fillRect(0, y, W, H - y);
        ctx.fillStyle = rgba(SOIL_DEEP, 0.9);
        ctx.fillRect(0, y, W, 1.5);
    }
    // 판 위 설명 글 — 크림 알약 바탕에 진한 글자
    function drawCaption(text: string, x: number, y: number, alignRight: boolean): void {
        ctx.font = CAPTION_FONT;
        const bw = ctx.measureText(text).width + 14;
        const bh = 20;
        const bx = alignRight ? x - bw : x;
        ctx.fillStyle = rgba(CREAM, 0.9);
        ctx.beginPath();
        ctx.moveTo(bx + 8, y);
        ctx.arcTo(bx + bw, y, bx + bw, y + bh, 8);
        ctx.arcTo(bx + bw, y + bh, bx, y + bh, 8);
        ctx.arcTo(bx, y + bh, bx, y, 8);
        ctx.arcTo(bx, y, bx + bw, y, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(INK, 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + 7, y + bh / 2 + 0.5);
    }
    function fmt(v: number, digits: number): string { return v.toFixed(digits); }
    // 떨어지는 잎 한 장(옆에서 본 판) — 자리·속도(px/s), 기운 각 tilt(라디안, 0 이면 수평으로 누움)·각속도 spin.
    // lift·drag·aoa 는 마지막 걸음의 양력·저항(px/s²)과 받음각(라디안) — 화살표·설명 글이 읽는다
    type Flyer = { x: number; y: number; vx: number; vy: number; tilt: number; spin: number; lift: number; drag: number; aoa: number };
    const GRAVITY = 380;
    // 공기 힘 세기 — 저항 = AIR_K·u²·(DRAG_BASE + sin²α), 양력 = LEAF_LIFT_GAIN·AIR_K·u²·|sin α·cos α|
    const AIR_K = 0.075;
    const DRAG_BASE = 0.1;
    const LEAF_LIFT_GAIN = 1.6;
    // 회전력 — 받음각 쪽 압력 중심 어긋남(TWIST_GAIN)과 기울기를 되돌리는 힘(RIGHTING_K), 각속도 감쇠(SPIN_DAMP)
    const TWIST_GAIN = 0.002;
    const RIGHTING_K = 14;
    const SPIN_DAMP = 1.5;
    function makeFlyer(x: number, y: number, tilt: number): Flyer {
        return { x: x, y: y, vx: 0, vy: 0, tilt: tilt, spin: 0, lift: 0, drag: 0, aoa: 0 };
    }
    // 한 걸음 — 잎이 느끼는 공기 속도(잎 속도 − 바람)를 잎 면 방향(cos α)과 법선 방향(sin α)으로 나눠
    // 저항은 공기 속도 반대로, 양력은 그에 수직으로(법선 압력이 미는 쪽) 더하고, 회전력으로 기울기를 바꾼다
    function flutterStep(f: Flyer, windX: number, windY: number, dt: number, liftGain: number): void {
        const rx = f.vx - windX;
        const ry = f.vy - windY;
        const u2 = rx * rx + ry * ry;
        const u = Math.sqrt(u2);
        let ax = 0;
        let ay = GRAVITY;
        let torque = -RIGHTING_K * Math.sin(f.tilt);
        f.lift = 0;
        f.drag = 0;
        if (u > 1e-6) {
            const tx = Math.cos(f.tilt);
            const ty = Math.sin(f.tilt);
            const nx = -ty;
            const ny = tx;
            const cosA = (rx * tx + ry * ty) / u;
            const sinA = (rx * nx + ry * ny) / u;
            f.aoa = Math.atan2(Math.abs(sinA), Math.abs(cosA));
            const drag = AIR_K * u2 * (DRAG_BASE + sinA * sinA);
            const lift = liftGain * AIR_K * u2 * Math.abs(sinA * cosA);
            // 양력 방향 — 법선 압력(−sgn(sin α)·n)에서 공기 속도 방향 성분을 빼 속도에 수직으로
            const side = sinA >= 0 ? -1 : 1;
            let px = side * nx;
            let py = side * ny;
            const along = (px * rx + py * ry) / u;
            px -= along * rx / u;
            py -= along * ry / u;
            const pl = Math.hypot(px, py);
            if (pl > 1e-6) { px /= pl; py /= pl; } else { px = 0; py = 0; }
            ax += -drag * rx / u + lift * px;
            ay += -drag * ry / u + lift * py;
            torque += -TWIST_GAIN * u2 * sinA * cosA;
            f.lift = lift;
            f.drag = drag;
        }
        f.spin += (torque - SPIN_DAMP * f.spin) * dt;
        f.tilt += f.spin * dt;
        f.vx += ax * dt;
        f.vy += ay * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
    }
    // 01 — 기운 각도로 양력·저항을 나눠 옆으로 미끄러지고, 기울기를 되돌리는 회전력으로 흔들리며 내려오는 잎 셋
    type Glider = { f: Flyer; kind: number; color: RGB; size: number; trail: Pt[]; landed: boolean };
    // 처음 자리 x, y 와 기운 각(라디안)
    const GLIDER_STARTS: [number, number, number][] = [[128, 30, 0.6], [338, 14, -0.9], [236, -18, 0.3]];
    const GLIDER_KINDS = [0, 1, 2];
    const GLIDER_SIZE = 46;
    const GROUND_Y = 272;
    const START_MS = 200;
    const LOOP_MS = 6400;
    // 자취 — TRAIL_EVERY 걸음마다 한 점, 많아야 TRAIL_MAX 점
    const TRAIL_EVERY = 4;
    const TRAIL_MAX = 120;
    // 힘 화살표 길이 (px 당 px/s²)
    const ARROW_SCALE = 0.12;
    // 포인터 바람 — 포인터에서 POINTER_RADIUS 안의 잎을 옆으로 민다 (px/s)
    const POINTER_WIND = 160;
    const POINTER_RADIUS = 80;
    const ANGLE_LABEL = '받음각 {a}° · 양력 {l} · 저항 {d}';
    const FORMULA_LABEL = '양력 ∝ sin 2α · 저항 ∝ sin²α';
    let gliders: Glider[] = [];
    let t = 0;
    let steps = 0;
    function build(): void {
        gliders = GLIDER_STARTS.map(function (s: [number, number, number], i: number): Glider {
            return { f: makeFlyer(s[0], s[1], s[2]), kind: GLIDER_KINDS[i], color: LEAF_COLORS[i * 2 % LEAF_COLORS.length], size: GLIDER_SIZE, trail: [], landed: false };
        });
        t = 0;
        steps = 0;
    }
    function loopLength(): number { return LOOP_MS; }
    function pointerWindAt(x: number, y: number): number {
        if (hoverX < 0) { return 0; }
        const dx = x - hoverX;
        const dy = y - hoverY;
        const d2 = dx * dx + dy * dy;
        return Math.sign(dx || 1) * POINTER_WIND * Math.exp(-d2 / (POINTER_RADIUS * POINTER_RADIUS));
    }
    function step(dt: number): void {
        t += dt * 1000;
        if (t < START_MS) { return; }
        steps += 1;
        for (let i = 0; i < gliders.length; i += 1) {
            const g = gliders[i];
            if (g.landed) { continue; }
            flutterStep(g.f, pointerWindAt(g.f.x, g.f.y), 0, dt, LEAF_LIFT_GAIN);
            if (steps % TRAIL_EVERY === 0) {
                g.trail.push([g.f.x, g.f.y]);
                if (g.trail.length > TRAIL_MAX) { g.trail.shift(); }
            }
            if (g.f.y >= GROUND_Y) {
                g.landed = true;
                g.f.y = GROUND_Y;
                g.f.tilt = 0;
            }
        }
    }
    // 동작 줄이기 — 셋 모두 바닥에 내려앉을 때까지 시뮬레이션을 그리지 않고 돌린 장면(지나온 자취 그대로)
    function finalScene(): void {
        build();
        for (let i = 0; i < 900; i += 1) { step(STEP_S); }
    }
    function onWake(): void { }
    function arrow(x: number, y: number, dx: number, dy: number, color: RGB): void {
        const len = Math.hypot(dx, dy);
        if (len < 2) { return; }
        const ux = dx / len;
        const uy = dy / len;
        ctx.strokeStyle = rgba(color, 0.95);
        ctx.fillStyle = rgba(color, 0.95);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy);
        ctx.lineTo(x + dx - ux * 7 - uy * 4, y + dy - uy * 7 + ux * 4);
        ctx.lineTo(x + dx - ux * 7 + uy * 4, y + dy - uy * 7 - ux * 4);
        ctx.closePath();
        ctx.fill();
    }
    function draw(): void {
        clearSky();
        drawGround(GROUND_Y + 8);
        for (let i = 0; i < gliders.length; i += 1) {
            const g = gliders[i];
            ctx.fillStyle = rgba(mixRGB(g.color, INK, 0.25), 0.55);
            for (let k = 0; k < g.trail.length; k += 1) {
                ctx.beginPath();
                ctx.arc(g.trail[k][0], g.trail[k][1], 1.6, 0, TAU);
                ctx.fill();
            }
        }
        for (let i = 0; i < gliders.length; i += 1) {
            const g = gliders[i];
            blitLeaf(spriteFor(g.kind, g.color, 0), g.f.x, g.f.y, g.size, g.f.tilt, 0.62, 1);
        }
        const lead = gliders[0];
        if (lead && !lead.landed && t >= START_MS) {
            const f = lead.f;
            const u = Math.hypot(f.vx, f.vy);
            if (u > 1) {
                const vx = f.vx / u;
                const vy = f.vy / u;
                // 저항은 속도 반대, 양력은 속도에 수직 — 둘 다 마지막 걸음의 힘
                arrow(f.x, f.y, -vx * f.drag * ARROW_SCALE, -vy * f.drag * ARROW_SCALE, INK);
                const sx = Math.sign(-vy * 0 + (Math.cos(f.tilt) * vy - Math.sin(f.tilt) * vx) >= 0 ? 1 : -1);
                arrow(f.x, f.y, vy * sx * f.lift * ARROW_SCALE, -vx * sx * f.lift * ARROW_SCALE, MAPLE);
            }
        }
        const lf = lead ? lead.f : makeFlyer(0, 0, 0);
        drawCaption(ANGLE_LABEL.replace('{a}', fmt(lf.aoa * 180 / Math.PI, 0)).replace('{l}', fmt(lf.lift, 0)).replace('{d}', fmt(lf.drag, 0)), 8, 8, false);
        drawCaption(FORMULA_LABEL, W - 8, H - 28, true);
    }
    // 일시정지 단추 — aria-pressed 가 참이면 멈춘 상태. 동작 줄이기면 멈춘 채로 시작한다
    let paused = still;
    // 지금 판이 동작 줄이기 한 장면인가 — 사람이 재생을 누르면 처음부터 다시 시작한다
    let stillShown = false;
    let ready = false;
    // 정리 뒤(리액트 언마운트)에 늦게 온 알림이 일을 시작하지 않게
    let alive = true;
    // 시연 시계(ms) — 16ms 고정 스텝으로만 늘어난다
    let clock = 0;
    function syncPause(): void { pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false'); }
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        onWake();
    }
    // 포인터 자리를 판 좌표(480×300)로 — 화면에 보이는 캔버스 크기와 상관없이
    function toBoard(ev: PointerEvent): Pt {
        const r = cv.getBoundingClientRect();
        return [(ev.clientX - r.left) * W / Math.max(1, r.width), (ev.clientY - r.top) * H / Math.max(1, r.height)];
    }
    function render(): void { draw(); }
    cv.addEventListener('pointermove', function (ev: PointerEvent): void {
        const p = toBoard(ev);
        hoverX = p[0];
        hoverY = p[1];
        wake();
        if (paused && ready) { render(); }
    }, { signal: off.signal });
    cv.addEventListener('pointerleave', function (): void {
        hoverX = -1;
        hoverY = -1;
        if (paused && ready) { render(); }
    }, { signal: off.signal });
    let rafId = 0;
    let lastTs = -1;
    let acc = 0;
    function frame(ts: number): void {
        if (paused || !alive) { rafId = 0; return; }
        if (lastTs < 0) { lastTs = ts; }
        // dt 상한 — 한 프레임에 DT_MAX 까지만 쌓는다. 숨었던 탭이 돌아와 간격이 수 초여도 잎이 순간이동하지 않게
        acc += Math.min(ts - lastTs, DT_MAX);
        lastTs = ts;
        let n = 0;
        while (acc >= FIXED_DT && n < MAX_STEPS) {
            clock += FIXED_DT;
            if (clock >= loopLength()) { clock = 0; build(); }
            step(STEP_S);
            acc -= FIXED_DT;
            n += 1;
        }
        render();
        rafId = window.requestAnimationFrame(frame);
    }
    function startLoop(): void {
        if (rafId) { return; }
        // 시계 기준을 새로 잡는다 — 첫 프레임 간격을 0 으로
        lastTs = -1;
        acc = 0;
        rafId = window.requestAnimationFrame(frame);
    }
    function stopLoop(): void {
        if (rafId) { window.cancelAnimationFrame(rafId); rafId = 0; }
    }
    // 동작 줄이기 — 루프를 돌리지 않고 잎이 이미 내려앉은 한 장면만 그린다
    function showStill(): void {
        stopLoop();
        finalScene();
        stillShown = true;
        render();
    }
    function play(): void {
        clock = 0;
        stillShown = false;
        build();
        render();
        startLoop();
    }
    pauseBtn.addEventListener('click', function (): void {
        wake();
        paused = !paused;
        syncPause();
        if (paused) { stopLoop(); render(); return; }
        // 동작 줄이기여도 사람이 직접 누르면 재생한다 — 한 장면에서 처음부터
        if (stillShown) { play(); } else { startLoop(); }
    }, { signal: off.signal });
    // 설정이 페이지를 연 채 바뀌면 — 켜지면 내려앉은 장면에서 멈추고, 꺼지면 시연을 처음부터
    function onMotionPref(): void {
        still = reduceQuery.matches;
        if (!ready) { return; }
        paused = still;
        syncPause();
        if (still) { showStill(); } else { play(); }
    }
    reduceQuery.addEventListener('change', onMotionPref, { signal: off.signal });
    // 탭이 숨으면 루프를 세우고, 돌아오면 시계를 다시 잡아 숨어 있던 시간을 한 번에 따라잡지 않는다
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); return; }
        if (!paused && ready) { startLoop(); }
    }, { signal: off.signal });
    window.addEventListener('resize', function (): void {
        fitCanvas();
        if (ready) { render(); }
    }, { signal: off.signal });
    function begin(): void {
        fitCanvas();
        build();
        ready = true;
        syncPause();
        if (still) { showStill(); } else { play(); }
    }
    begin();
    return function (): void {
        alive = false;
        stopLoop();
        off.abort();
    };
  }, []);

  return (
    <div className={cx("lf") + " is-demo"} ref={rootRef}>
        <canvas className={cx("lf__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label="기운 각도에 따라 양력과 저항을 받아 옆으로 미끄러지며 흔들리듯 내려오는 잎 세 장."></canvas>
        <button className={cx("lf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
