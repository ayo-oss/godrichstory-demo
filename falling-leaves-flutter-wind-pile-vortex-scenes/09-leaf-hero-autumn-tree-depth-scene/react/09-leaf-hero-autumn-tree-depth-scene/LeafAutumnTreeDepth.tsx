// LeafAutumnTreeDepth - vanilla 판(09-leaf-hero-autumn-tree-depth-scene) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./LeafAutumnTreeDepth.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function LeafAutumnTreeDepth() {
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
    // 가지에 매달린 잎 — 꼭지 자리(ax, ay)에서 길이 len 만큼 뻗은 각 스프링. ang 은 꼭지→잎 방향(라디안), rest 는 쉬는 각.
    // fatigue 는 휜 각도²을 시간으로 쌓은 값, limit 을 넘으면 snapped
    type Stem = { ax: number; ay: number; len: number; rest: number; ang: number; angVel: number; fatigue: number; limit: number; snapped: boolean };
    const STEM_K = 70;
    const STEM_DAMP = 2.2;
    const FATIGUE_RATE = 1;
    // 바람이 꼭지를 돌리는 세기 — 회전력 = −sin(ang)·바람·STEM_WIND
    const STEM_WIND = 0.05;
    function makeStem(ax: number, ay: number, len: number, rest: number, limit: number): Stem {
        return { ax: ax, ay: ay, len: len, rest: rest, ang: rest, angVel: 0, fatigue: 0, limit: limit, snapped: false };
    }
    // 한 걸음 — 끊기는 걸음에 true. 끊긴 뒤에는 움직이지 않는다
    function stemStep(s: Stem, windX: number, dt: number): boolean {
        if (s.snapped) { return false; }
        const bend = s.ang - s.rest;
        const torque = -Math.sin(s.ang) * windX * STEM_WIND;
        s.angVel += (-STEM_K * bend - STEM_DAMP * s.angVel + torque) * dt;
        s.ang += s.angVel * dt;
        s.fatigue += bend * bend * FATIGUE_RATE * dt;
        if (s.fatigue >= s.limit) { s.snapped = true; return true; }
        return false;
    }
    // 꼭지 끝(잎이 붙은 자리)
    function stemTip(s: Stem): Pt { return [s.ax + Math.cos(s.ang) * s.len, s.ay + Math.sin(s.ang) * s.len]; }
    // 반지름 r 자리의 속도 — 각속도 × r, 반지름에 수직. 끊기는 순간 이 속도를 그대로 자유 낙하로 넘긴다
    function stemVelocityAt(s: Stem, r: number): Pt { return [-Math.sin(s.ang) * s.angVel * r, Math.cos(s.ang) * s.angVel * r]; }
    // 바람장 — 부드러운 노이즈로 자리마다 방향·세기를 정하고, 화면을 가로지르는 돌풍 띠가 그 위에 더해진다
    const WIND_SCALE = 0.007;
    const WIND_DRIFT = 0.4;
    const WIND_BASE = 34;
    const WIND_SWIRL = 46;
    // 돌풍 띠 — 가운데가 GUST_SPEED px/s 로 오른쪽으로 가고, 세기는 가운데에서 멀수록 종 모양 폭(GUST_WIDTH)으로 줄어든다
    const GUST_SPEED = 220;
    const GUST_WIDTH = 64;
    const GUST_GAIN = 300;
    const GUST_GAP = 420;
    const windNoise = makeNoise(4790);
    function gustCenter(t: number, speed: number): number {
        const span = W + GUST_WIDTH * 6 + GUST_GAP;
        return -GUST_WIDTH * 1.5 + ((t * speed) % span);
    }
    // 종 모양 폭 — 띠 가운데에서 1, GUST_WIDTH 만큼 떨어지면 1/e
    function gustWeight(x: number, center: number): number {
        const k = (x - center) / GUST_WIDTH;
        return Math.exp(-k * k);
    }
    // 자리 (x, y)·시각 t(초)의 바람(px/s) — out[0] 가로, out[1] 세로(아래가 +)
    function windAt(x: number, y: number, t: number, center: number, out: Pt): void {
        const n1 = windNoise(x * WIND_SCALE - t * WIND_DRIFT, y * WIND_SCALE);
        const n2 = windNoise(x * WIND_SCALE + 31.7, y * WIND_SCALE - t * WIND_DRIFT * 0.7);
        const g = gustWeight(x, center);
        out[0] = WIND_BASE + WIND_SWIRL * n1 + GUST_GAIN * g;
        // 돌풍 안은 살짝 위로 들어 올린다
        out[1] = WIND_SWIRL * 0.6 * n2 - GUST_GAIN * 0.18 * g;
    }
    // 바닥 더미 — 바닥을 폭 cellW 칸으로 나누고 칸마다 쌓인 잎 목록을 둔다. 칸 높이 = 잎 수 × LEAF_THICK
    // slideAge 가 0 이상이면 이웃 칸에서 흘러내려 오는 중(fromX, fromY 에서 제자리로)
    type PileLeaf = { kind: number; color: number; jitter: number; tilt: number; slideAge: number; fromX: number; fromY: number };
    type Heap = { x0: number; cellW: number; ground: number; cols: PileLeaf[][]; moves: number };
    const LEAF_THICK = 2.6;
    // 한계 기울기 — 이웃 칸과의 높이 차 ÷ 칸 폭 이 이 값을 넘으면 흘러내린다
    const REPOSE_SLOPE = 0.9;
    const SLIDE_MS = 260;
    function heapMake(x0: number, count: number, cellW: number, ground: number): Heap {
        const cols: PileLeaf[][] = [];
        for (let i = 0; i < count; i += 1) { cols.push([]); }
        return { x0: x0, cellW: cellW, ground: ground, cols: cols, moves: 0 };
    }
    function heapCol(hp: Heap, x: number): number { return clamp(Math.floor((x - hp.x0) / hp.cellW), 0, hp.cols.length - 1); }
    function heapTop(hp: Heap, c: number): number { return hp.ground - hp.cols[c].length * LEAF_THICK; }
    function heapSlotX(hp: Heap, c: number, leaf: PileLeaf): number { return hp.x0 + (c + 0.5 + leaf.jitter * 0.6) * hp.cellW; }
    function heapSlotY(hp: Heap, level: number): number { return hp.ground - (level + 0.5) * LEAF_THICK; }
    // 무너짐 — 칸마다 양옆을 보고, 높이 차 ÷ 칸 폭 이 slope 를 넘는 쪽(더 가파른 쪽)으로 맨 위 잎 하나를 옮긴다.
    // 옮길 것이 없을 때까지 되풀이(한 번에 많아야 maxMoves). 훑는 방향은 판마다 바꿔 한쪽으로 쏠리지 않게
    function heapRelax(hp: Heap, slope: number, maxMoves: number): number {
        const n = hp.cols.length;
        let moved = 0;
        let changed = true;
        let pass = 0;
        while (changed && moved < maxMoves) {
            changed = false;
            for (let i = 0; i < n && moved < maxMoves; i += 1) {
                const c = pass % 2 === 0 ? i : n - 1 - i;
                const h = hp.cols[c].length;
                let best = -1;
                let bestDrop = 0;
                for (let k = 0; k < 2; k += 1) {
                    const nb = c + ((k + pass) % 2 === 0 ? -1 : 1);
                    if (nb < 0 || nb >= n) { continue; }
                    const drop = (h - hp.cols[nb].length) * LEAF_THICK / hp.cellW;
                    if (drop > slope && drop > bestDrop) { best = nb; bestDrop = drop; }
                }
                if (best < 0) { continue; }
                const leaf = hp.cols[c].pop() as PileLeaf;
                leaf.fromX = heapSlotX(hp, c, leaf);
                leaf.fromY = heapSlotY(hp, h - 1);
                leaf.slideAge = 0;
                hp.cols[best].push(leaf);
                moved += 1;
                changed = true;
            }
            pass += 1;
        }
        hp.moves += moved;
        return moved;
    }
    // 칸의 겉면 기울기(라디안) — 양옆 칸 높이 차로. 쌓인 잎은 이 각도로 눕힌다
    function heapSlopeAngle(hp: Heap, c: number): number {
        const l = hp.cols[Math.max(0, c - 1)].length;
        const r = hp.cols[Math.min(hp.cols.length - 1, c + 1)].length;
        return -Math.atan2((r - l) * LEAF_THICK, hp.cellW * 2);
    }
    function heapCount(hp: Heap): number {
        let s = 0;
        for (let i = 0; i < hp.cols.length; i += 1) { s += hp.cols[i].length; }
        return s;
    }
    function heapAdvance(hp: Heap, dtMs: number): void {
        for (let c = 0; c < hp.cols.length; c += 1) {
            const col = hp.cols[c];
            for (let k = 0; k < col.length; k += 1) {
                if (col[k].slideAge >= 0) {
                    col[k].slideAge += dtMs;
                    if (col[k].slideAge >= SLIDE_MS) { col[k].slideAge = -1; }
                }
            }
        }
    }
    // 더미 그리기 — 아래 칸부터, 잎마다 칸 기울기로 눕힌 스프라이트. 흘러내리는 잎은 옛 자리에서 새 자리로 미끄러진다
    function drawHeap(hp: Heap, size: number, blur: number, alpha: number): void {
        for (let c = 0; c < hp.cols.length; c += 1) {
            const col = hp.cols[c];
            const ang = heapSlopeAngle(hp, c);
            for (let k = 0; k < col.length; k += 1) {
                const lf = col[k];
                let x = heapSlotX(hp, c, lf);
                let y = heapSlotY(hp, k);
                if (lf.slideAge >= 0) {
                    const s = smooth(lf.slideAge / SLIDE_MS);
                    x = lerp(lf.fromX, x, s);
                    y = lerp(lf.fromY, y, s);
                }
                blitLeaf(spriteFor(lf.kind, LEAF_COLORS[lf.color], blur), x, y, size, ang + lf.tilt, 0.55, alpha);
            }
        }
    }
    // 09 — 가을 나무 장면. 앞·중간·먼 세 층에 잎을 나눠 멀수록 작게(LAYER_SCALE)·흐리게(LAYER_BLUR)·느리게(LAYER_SPEED) 그린다.
    // 중간 층 나무는 시드 고정 재귀 분기로 한 번만 그려 두고, 가지 끝 꼭지(05 의 lib/stem)가 끊기면 잎이 노이즈 바람(03 의 lib/wind)과
    // 양력 걸음(lib/flutter)으로 내려와 바닥 더미(06 의 lib/heap)에 쌓인다. 모두 tail 의 한 시계로 돈다
    type Drift9 = { x: number; y: number; vx: number; vy: number; tilt: number; flip: number; kind: number; color: number; size: number };
    type Hang9 = { stem: Stem; fly: Flyer | null; kind: number; color: number; spot: number };
    type Seg = { x0: number; y0: number; x1: number; y1: number; w: number };
    // 층 0 앞 · 1 중간 · 2 먼
    const LAYER_SCALE = [1, 0.62, 0.38];
    const LAYER_BLUR = [0, 0.5, 1.6];
    const LAYER_SPEED = [1, 0.72, 0.45];
    const NEAR_COUNT = 7;
    const FAR_COUNT = 44;
    const HANG_COUNT = 18;
    // 나무 — 몇 번 갈라지는가 · 갈래 각(라디안) · 한 번 갈라질 때 길이 비
    const BRANCH_DEPTH = 6;
    const BRANCH_SPREAD = 0.44;
    const BRANCH_SHRINK = 0.74;
    const TREE_X = 168;
    const TREE_GROUND = 262;
    const TRUNK_LEN = 74;
    const BASE_LEAF = 40;
    const SCENE_START_MS = 200;
    const SCENE_LOOP_MS = 12000;
    const LAYER_LABEL = '앞 · 중간 · 먼 층 = 크기 ×{a} · ×{b} · ×{c}';
    const FALL_LABEL = '끊긴 잎 {n}장 · 더미 {m}장';
    let segs: Seg[] = [];
    let tips: Pt[] = [];
    let treeCv: HTMLCanvasElement | null = null;
    let treeDraws = 0;
    let near: Drift9[] = [];
    let far: Drift9[] = [];
    let hang: Hang9[] = [];
    let pile9: Heap = heapMake(0, 60, 8, TREE_GROUND);
    let t09 = 0;
    let fallen = 0;
    let rng09 = makeRng(4799);
    const wind9: Pt = [0, 0];
    // 재귀 분기 — 같은 시드면 같은 나무
    function growTree(): void {
        segs = [];
        tips = [];
        const rng = makeRng(47990);
        function branch(x: number, y: number, ang: number, len: number, depth: number, w: number): void {
            const x1 = x + Math.cos(ang) * len;
            const y1 = y + Math.sin(ang) * len;
            segs.push({ x0: x, y0: y, x1: x1, y1: y1, w: w });
            if (depth >= BRANCH_DEPTH) { tips.push([x1, y1]); return; }
            const j = (rng() - 0.5) * 0.18;
            branch(x1, y1, ang - BRANCH_SPREAD + j, len * BRANCH_SHRINK, depth + 1, w * 0.68);
            branch(x1, y1, ang + BRANCH_SPREAD + j, len * BRANCH_SHRINK * 0.94, depth + 1, w * 0.68);
        }
        branch(TREE_X, TREE_GROUND, -Math.PI / 2, TRUNK_LEN, 1, 12);
    }
    // 나무와 붙어 있는 잎 무리는 오프스크린에 한 번만 그린다 — 매 프레임은 이 판 하나를 찍는다
    function paintTree(): void {
        treeDraws += 1;
        const cvs = document.createElement('canvas');
        cvs.width = W * 2;
        cvs.height = H * 2;
        treeCv = cvs;
        const g = cvs.getContext('2d');
        if (!g) { return; }
        g.scale(2, 2);
        g.lineCap = 'round';
        for (let i = 0; i < segs.length; i += 1) {
            const s = segs[i];
            g.strokeStyle = rgba(i === 0 ? BARK_DEEP : BARK, 1);
            g.lineWidth = s.w;
            g.beginPath();
            g.moveTo(s.x0, s.y0);
            g.lineTo(s.x1, s.y1);
            g.stroke();
        }
        const rng = makeRng(47991);
        const size = BASE_LEAF * LAYER_SCALE[1];
        for (let i = 0; i < tips.length; i += 1) {
            for (let k = 0; k < 3; k += 1) {
                const sp = spriteFor((i + k) % LEAF_KINDS, LEAF_COLORS[(i * 3 + k) % LEAF_COLORS.length], LAYER_BLUR[1]);
                const kk = size / SPRITE_SIZE;
                g.save();
                g.translate(tips[i][0] + (rng() - 0.5) * 16, tips[i][1] + (rng() - 0.5) * 12);
                g.rotate(rng() * TAU);
                g.scale(kk, kk * 0.7);
                g.drawImage(sp.cv, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
                g.restore();
            }
        }
    }
    function newDrift(layer: number, scatter: boolean): Drift9 {
        const sz = BASE_LEAF * LAYER_SCALE[layer] * (0.8 + rng09() * 0.4);
        return { x: scatter ? rng09() * W : -30, y: rng09() * (layer === 0 ? H : TREE_GROUND - 40), vx: 0, vy: 0, tilt: rng09() * TAU, flip: rng09() * TAU, kind: Math.floor(rng09() * LEAF_KINDS), color: Math.floor(rng09() * LEAF_COLORS.length), size: sz };
    }
    function newHang(spot: number): Hang9 {
        const tip = tips[spot];
        return { stem: makeStem(tip[0], tip[1], 6, Math.PI / 2 + (rng09() - 0.5) * 0.4, 0.004 + rng09() * 0.05), fly: null, kind: Math.floor(rng09() * LEAF_KINDS), color: Math.floor(rng09() * LEAF_COLORS.length), spot: spot };
    }
    function build(): void {
        rng09 = makeRng(4799);
        if (!treeCv) { growTree(); paintTree(); }
        near = [];
        far = [];
        hang = [];
        for (let i = 0; i < NEAR_COUNT; i += 1) { near.push(newDrift(0, true)); }
        for (let i = 0; i < FAR_COUNT; i += 1) { far.push(newDrift(2, true)); }
        for (let i = 0; i < HANG_COUNT; i += 1) { hang.push(newHang(Math.floor(i * tips.length / HANG_COUNT + 1) % tips.length)); }
        pile9 = heapMake(0, 60, 8, TREE_GROUND);
        for (let i = 0; i < 70; i += 1) {
            pile9.cols[heapCol(pile9, TREE_X + (rng09() - 0.5) * 150)].push({ kind: i % LEAF_KINDS, color: i % LEAF_COLORS.length, jitter: rng09() - 0.5, tilt: (rng09() - 0.5) * 1.2, slideAge: -1, fromX: 0, fromY: 0 });
            heapRelax(pile9, REPOSE_SLOPE, 40);
        }
        for (let c = 0; c < pile9.cols.length; c += 1) { for (let k = 0; k < pile9.cols[c].length; k += 1) { pile9.cols[c][k].slideAge = -1; } }
        t09 = 0;
        fallen = 0;
    }
    function loopLength(): number { return SCENE_LOOP_MS; }
    function driftStep(d: Drift9, layer: number, ts: number, center: number, dt: number): void {
        const sp = LAYER_SPEED[layer];
        windAt(d.x, d.y, ts, center, wind9);
        d.vx += (wind9[0] * sp - d.vx) * 2.2 * dt;
        d.vy += ((wind9[1] + 46) * sp - d.vy) * 2.2 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.tilt += (0.8 + 0.01 * Math.abs(wind9[0])) * sp * dt;
        d.flip += 2 * sp * dt;
        if (d.x > W + 40) { d.x = -40; }
        if (d.y > H + 40) { d.y = -40; }
        if (d.y < -40) { d.y = H + 40; }
    }
    function step(dt: number): void {
        t09 += dt * 1000;
        heapAdvance(pile9, dt * 1000);
        if (t09 < SCENE_START_MS) { return; }
        const ts = (t09 - SCENE_START_MS) / 1000;
        const center = gustCenter(ts, GUST_SPEED);
        for (let i = 0; i < near.length; i += 1) { driftStep(near[i], 0, ts, center, dt); }
        for (let i = 0; i < far.length; i += 1) { driftStep(far[i], 2, ts, center, dt); }
        for (let i = 0; i < hang.length; i += 1) {
            const h = hang[i];
            if (!h.fly) {
                const tip = stemTip(h.stem);
                windAt(tip[0], tip[1], ts, center, wind9);
                if (stemStep(h.stem, wind9[0] * LAYER_SPEED[1], dt)) {
                    const r = 6 + BASE_LEAF * LAYER_SCALE[1] / 2;
                    const v = stemVelocityAt(h.stem, r);
                    const f = makeFlyer(h.stem.ax + Math.cos(h.stem.ang) * r, h.stem.ay + Math.sin(h.stem.ang) * r, h.stem.ang);
                    f.vx = v[0];
                    f.vy = v[1];
                    h.fly = f;
                    fallen += 1;
                }
                continue;
            }
            windAt(h.fly.x, h.fly.y, ts, center, wind9);
            flutterStep(h.fly, wind9[0] * LAYER_SPEED[1] * 0.6, 0, dt, LEAF_LIFT_GAIN);
            const c = heapCol(pile9, h.fly.x);
            if (h.fly.y >= heapTop(pile9, c) - 1 || h.fly.x > W + 30) {
                if (h.fly.x <= W + 30) {
                    pile9.cols[c].push({ kind: h.kind, color: h.color, jitter: rng09() - 0.5, tilt: (rng09() - 0.5) * 1.2, slideAge: -1, fromX: 0, fromY: 0 });
                    heapRelax(pile9, REPOSE_SLOPE, 40);
                }
                // 내려앉은 잎 자리에는 새 잎이 다시 달린다 — 잎 수는 HANG_COUNT 그대로
                hang[i] = newHang(h.spot);
            }
        }
    }
    // 동작 줄이기 — 바람이 잔 판. 6초를 그리지 않고 돌려 더미를 쌓은 뒤, 날던 잎은 모두 땅에 눕힌다
    function finalScene(): void {
        build();
        const n = Math.ceil(6000 / FIXED_DT);
        for (let i = 0; i < n; i += 1) { step(STEP_S); }
        for (let i = 0; i < hang.length; i += 1) { if (hang[i].fly) { hang[i] = newHang(hang[i].spot); } }
        for (let i = 0; i < near.length; i += 1) {
            near[i].x = 30 + i * (W - 60) / Math.max(1, near.length - 1);
            near[i].y = H - 12 - (i % 2) * 6;
            near[i].tilt = (i % 2 === 0 ? 0.2 : -0.25);
            near[i].flip = 1.1;
        }
        for (let i = 0; i < far.length; i += 1) {
            far[i].y = 214 - 26 * Math.sin(far[i].x * 0.011 + 0.6) - 12 * Math.sin(far[i].x * 0.031);
            far[i].tilt = 0;
            far[i].flip = 1.2;
        }
    }
    function onWake(): void { }
    function drawDrift(d: Drift9, layer: number): void {
        blitLeaf(spriteFor(d.kind, LEAF_COLORS[d.color], LAYER_BLUR[layer]), d.x, d.y, d.size, d.tilt, 0.3 + 0.7 * Math.abs(Math.cos(d.flip)), layer === 2 ? 0.8 : 1);
    }
    function drawHills(): void {
        ctx.fillStyle = rgba(mixRGB(SKY_TOP, SAGE, 0.35), 1);
        ctx.beginPath();
        ctx.moveTo(0, TREE_GROUND);
        for (let x = 0; x <= W; x += 12) { ctx.lineTo(x, 200 - 26 * Math.sin(x * 0.011 + 0.6) - 12 * Math.sin(x * 0.031)); }
        ctx.lineTo(W, TREE_GROUND);
        ctx.closePath();
        ctx.fill();
    }
    function draw(): void {
        clearSky();
        drawHills();
        for (let i = 0; i < far.length; i += 1) { drawDrift(far[i], 2); }
        drawGround(TREE_GROUND);
        if (treeCv) { ctx.drawImage(treeCv, 0, 0, W, H); }
        const msize = BASE_LEAF * LAYER_SCALE[1];
        for (let i = 0; i < hang.length; i += 1) {
            const h = hang[i];
            const sp = spriteFor(h.kind, LEAF_COLORS[h.color], LAYER_BLUR[1]);
            if (!h.fly) {
                const tip = stemTip(h.stem);
                blitLeaf(sp, tip[0] + Math.cos(h.stem.ang) * msize / 2, tip[1] + Math.sin(h.stem.ang) * msize / 2, msize, h.stem.ang, 0.7, 1);
            } else {
                blitLeaf(sp, h.fly.x, h.fly.y, msize, h.fly.tilt, 0.62, 1);
            }
        }
        drawHeap(pile9, msize * 0.8, LAYER_BLUR[1], 1);
        for (let i = 0; i < near.length; i += 1) { drawDrift(near[i], 0); }
        drawCaption(LAYER_LABEL.replace('{a}', fmt(LAYER_SCALE[0], 2)).replace('{b}', fmt(LAYER_SCALE[1], 2)).replace('{c}', fmt(LAYER_SCALE[2], 2)), 8, 8, false);
        drawCaption(FALL_LABEL.replace('{n}', fmt(fallen, 0)).replace('{m}', fmt(heapCount(pile9), 0)), W - 8, H - 28, true);
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
        <canvas className={cx("lf__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label="가을 나무에서 끊긴 잎이 바람을 타고 내려와 바닥 더미에 쌓이고, 앞과 먼 곳의 잎이 크기와 흐림을 달리하며 날린다."></canvas>
        <button className={cx("lf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
