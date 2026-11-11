// LeafHeapReposeSlide - vanilla 판(06-leaf-ground-heap-repose-slide) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./LeafHeapReposeSlide.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function LeafHeapReposeSlide() {
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
    // 06 — 한 자리로 쏟아지는 잎이 바닥 칸 높이맵(lib/heap)에 쌓이고, 이웃 칸과의 높이 차 ÷ 칸 폭이
    // REPOSE_SLOPE 를 넘을 때마다 맨 위 잎이 낮은 쪽으로 흘러내려 더미가 한계 기울기의 둔덕으로 정리된다
    type Pouring = { x: number; y: number; vx: number; vy: number; tilt: number; spin: number; kind: number; color: number; jitter: number };
    const CELL_W = 12;
    const PILE_GROUND = 272;
    // 쏟는 자리와 퍼짐(px), 초당 잎 수, 모두 몇 장
    const POUR_X = 236;
    const POUR_SPREAD = 16;
    const POUR_RATE = 80;
    const POUR_TOTAL = 440;
    // 시작할 때 이미 쌓여 있는 잎 — 첫 2초 안에 흘러내림이 보이게
    const PRESEED = 160;
    const PILE_FALL = 150;
    const PILE_LEAF_SIZE = 20;
    // 잎 하나가 내려앉은 뒤 한 번에 옮길 수 있는 잎 수 상한
    const RELAX_PER_LAND = 40;
    const PILE_START_MS = 200;
    const PILE_LOOP_MS = 10400;
    const SLOPE_LABEL = '한계 기울기 {s} ({d}°) · 흘러내림 {m}회';
    const PILE_LABEL = '더미 {n}장 · 꼭대기 {h}px';
    let hp: Heap = heapMake(0, Math.ceil(W / CELL_W), CELL_W, PILE_GROUND);
    let pouring: Pouring[] = [];
    let poured = 0;
    let pourAcc = 0;
    let t06 = 0;
    let rng06 = makeRng(4796);
    function newPileLeaf(): PileLeaf {
        return { kind: Math.floor(rng06() * LEAF_KINDS), color: Math.floor(rng06() * LEAF_COLORS.length), jitter: rng06() - 0.5, tilt: (rng06() - 0.5) * 1.2, slideAge: -1, fromX: 0, fromY: 0 };
    }
    function land(x: number, leaf: PileLeaf): void {
        hp.cols[heapCol(hp, x)].push(leaf);
        heapRelax(hp, REPOSE_SLOPE, RELAX_PER_LAND);
    }
    function build(): void {
        rng06 = makeRng(4796);
        hp = heapMake(0, Math.ceil(W / CELL_W), CELL_W, PILE_GROUND);
        for (let i = 0; i < PRESEED; i += 1) { land(POUR_X + (rng06() - 0.5) * POUR_SPREAD * 2, newPileLeaf()); }
        // 미리 쌓은 잎은 미끄러지는 중으로 보이지 않게
        for (let c = 0; c < hp.cols.length; c += 1) { for (let k = 0; k < hp.cols[c].length; k += 1) { hp.cols[c][k].slideAge = -1; } }
        hp.moves = 0;
        pouring = [];
        poured = 0;
        pourAcc = 0;
        t06 = 0;
    }
    function loopLength(): number { return PILE_LOOP_MS; }
    function step(dt: number): void {
        t06 += dt * 1000;
        heapAdvance(hp, dt * 1000);
        if (t06 < PILE_START_MS) { return; }
        pourAcc += POUR_RATE * dt;
        while (pourAcc >= 1 && poured < POUR_TOTAL) {
            pourAcc -= 1;
            poured += 1;
            const lf = newPileLeaf();
            pouring.push({ x: POUR_X + (rng06() - 0.5) * POUR_SPREAD * 2, y: -12 - rng06() * 30, vx: (rng06() - 0.5) * 24, vy: PILE_FALL * (0.8 + rng06() * 0.4), tilt: rng06() * TAU, spin: (rng06() - 0.5) * 6, kind: lf.kind, color: lf.color, jitter: lf.jitter });
        }
        const keep: Pouring[] = [];
        for (let i = 0; i < pouring.length; i += 1) {
            const p = pouring[i];
            p.x += (p.vx + 14 * Math.sin(p.tilt)) * dt;
            p.y += p.vy * dt;
            p.tilt += p.spin * dt;
            const c = heapCol(hp, p.x);
            if (p.y >= heapTop(hp, c) - 2) {
                land(p.x, { kind: p.kind, color: p.color, jitter: p.jitter, tilt: (p.jitter) * 1.2, slideAge: -1, fromX: 0, fromY: 0 });
                continue;
            }
            keep.push(p);
        }
        pouring = keep;
    }
    // 동작 줄이기 — 다 쏟고 흘러내림까지 끝난 더미
    function finalScene(): void {
        build();
        for (let i = 0; i < 1600; i += 1) {
            step(STEP_S);
            if (poured >= POUR_TOTAL && pouring.length === 0) { break; }
        }
        heapAdvance(hp, SLIDE_MS);
    }
    function onWake(): void { }
    function peak(): number {
        let best = 0;
        for (let c = 0; c < hp.cols.length; c += 1) { if (hp.cols[c].length > hp.cols[best].length) { best = c; } }
        return best;
    }
    // 한계 기울기 안내선 — 꼭대기에서 양쪽으로 REPOSE_SLOPE 비탈
    function drawGuide(): void {
        const c = peak();
        const top = heapTop(hp, c);
        const x = hp.x0 + (c + 0.5) * CELL_W;
        const run = (PILE_GROUND - top) / REPOSE_SLOPE;
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = rgba(INK, 0.55);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(x - run, PILE_GROUND);
        ctx.lineTo(x, top);
        ctx.lineTo(x + run, PILE_GROUND);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    function draw(): void {
        clearSky();
        drawGround(PILE_GROUND);
        drawHeap(hp, PILE_LEAF_SIZE, 0, 1);
        for (let i = 0; i < pouring.length; i += 1) {
            const p = pouring[i];
            blitLeaf(spriteFor(p.kind, LEAF_COLORS[p.color], 0), p.x, p.y, PILE_LEAF_SIZE, p.tilt, 0.4 + 0.5 * Math.abs(Math.sin(p.tilt)), 1);
        }
        drawGuide();
        drawCaption(SLOPE_LABEL.replace('{s}', fmt(REPOSE_SLOPE, 1)).replace('{d}', fmt(Math.atan(REPOSE_SLOPE) * 180 / Math.PI, 0)).replace('{m}', fmt(hp.moves, 0)), 8, 8, false);
        drawCaption(PILE_LABEL.replace('{n}', fmt(heapCount(hp), 0)).replace('{h}', fmt(PILE_GROUND - heapTop(hp, peak()), 0)), W - 8, 8, true);
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
        <canvas className={cx("lf__canvas")} data-role="canvas" width={480} height={300} role="img" aria-label="한 자리로 쏟아지는 낙엽이 바닥에 쌓이고, 비탈이 가팔라지면 옆으로 흘러내려 둔덕이 된다."></canvas>
        <button className={cx("lf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
