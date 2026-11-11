// PowerStepColorTile - 같은 항목 vanilla 판 index.html 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./PowerStepColorTile.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function PowerStepColorTile() {
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
    // 문자열 폭 = 글자 하나씩 잰 폭의 합
    function textWidth(s: string, px: number, weight: number, m: Measure): number {
        let w = 0;
        for (const ch of Array.from(s)) { w += m(ch, px, weight); }
        return w;
    }

    // 장면 시계(초)와 상태 줄 글자 — 장면 계산이 고치고, 화면 쪽이 읽어 그린다
    let sceneT = 0;
    let simStatus = '';
    // 자동 시연이 수를 두는가 — 사람이 판에서 방향키·쓸기(04 는 백스페이스도)로 처음 손대면 꺼지고, 그 뒤로는 사람 수만 둔다
    let autoOn = true;
    // 파스텔 팔레트 — 크림 바탕 위 라벤더·민트·버터·산호. 글자는 진한 쪽으로 명도 차를 둔다
    const PAPER: RGB = [251, 247, 238];
    const PAPER_DIM: RGB = [236, 228, 214];
    const BOARD_BG: RGB = [214, 204, 190];
    const CELL_BG: RGB = [232, 224, 212];
    const INK: RGB = [44, 38, 58];
    const INK_SOFT: RGB = [104, 96, 118];
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
    function mix(a: RGB, b: RGB, k: number): RGB { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
    function rgba(c: RGB, a: number): string {
        return 'rgba(' + Math.round(clamp(c[0], 0, 255)) + ',' + Math.round(clamp(c[1], 0, 255)) + ',' + Math.round(clamp(c[2], 0, 255)) + ',' + clamp(a, 0, 1).toFixed(3) + ')';
    }

    // ── 판 규칙 ──────────────────────────────────────────────────
    // 판은 칸 16개. 칸 번호 = 행 × 4 + 열, 값 0 = 빈칸
    const SIZE = 4;
    const CELLS = SIZE * SIZE;
    // 방향 번호 — 0 왼쪽 · 1 위 · 2 오른쪽 · 3 아래
    const DIR_LEFT = 0;
    const DIR_UP = 1;
    const DIR_RIGHT = 2;
    const DIR_DOWN = 3;
    const DIR_NAMES = ['왼쪽', '위', '오른쪽', '아래'];
    // 방향마다 판을 시계 방향으로 몇 번 돌리면 그 방향의 벽이 왼쪽에 오는가 — 위는 세 번, 오른쪽은 두 번, 아래는 한 번
    const TURNS = [0, 3, 2, 1];
    // 새 타일이 4 일 확률 — 나머지는 2
    const FOUR_CHANCE = 0.1;

    type Tile = { id: number; v: number; cell: number };
    // 한 수의 기록 — 미끄러진 타일(출발·도착 칸)과 합쳐진 타일(부모 번호들 → 새 번호), 얻은 점수, 수 앞뒤 판, 새로 돋은 타일
    type Slide = { id: number; v: number; from: number; to: number };
    type Merge = { id: number; v: number; cell: number; parents: number[] };
    type Move = { dir: number; moved: boolean; slides: Slide[]; merges: Merge[]; gain: number; before: Tile[]; after: Tile[]; spawn: Tile | null };
    type Game = { tiles: Tile[]; nextId: number; score: number; rng: () => number };

    // 칸 번호 표를 시계 방향으로 한 번 돌린다 — 새 (행 r, 열 c) 자리에 원래 (행 3 − c, 열 r) 칸이 온다
    function rotateCW(g: number[]): number[] {
        const out: number[] = [];
        for (let r = 0; r < SIZE; r += 1) {
            for (let c = 0; c < SIZE; c += 1) { out.push(g[(SIZE - 1 - c) * SIZE + r]); }
        }
        return out;
    }
    // 방향 dir 로 밀 때 읽는 순서 — order[r × 4 + k] = 돌린 판의 행 r, 왼쪽 벽에서 k 번째 자리에 오는 원래 칸 번호
    function pushOrder(dir: number): number[] {
        let g: number[] = [];
        for (let i = 0; i < CELLS; i += 1) { g.push(i); }
        for (let t = 0; t < TURNS[dir]; t += 1) { g = rotateCW(g); }
        return g;
    }
    const ORDERS: number[][] = [0, 1, 2, 3].map(pushOrder);

    // 한 줄 압축 — 빈칸을 걷어 낸 뒤 왼쪽 벽부터 같은 값의 이웃을 합친다.
    // lock 이면 이번 수에 합쳐서 생긴 타일은 같은 수 안에서 다시 합치지 않는다(2·2·4 → 4·4). lock 이 없으면 2·2·4 → 8
    type LineOut = { ids: number[]; v: number; merged: boolean };
    function compressLine(line: (Tile | null)[], lock: boolean): LineOut[] {
        const out: LineOut[] = [];
        for (const t of line) {
            if (!t) { continue; }
            const last = out.length ? out[out.length - 1] : null;
            if (last && last.v === t.v && !(lock && last.merged)) {
                last.v *= 2;
                last.ids.push(t.id);
                last.merged = true;
            } else {
                out.push({ ids: [t.id], v: t.v, merged: false });
            }
        }
        return out;
    }
    function gridOf(tiles: Tile[]): (Tile | null)[] {
        const g: (Tile | null)[] = [];
        for (let i = 0; i < CELLS; i += 1) { g.push(null); }
        for (const t of tiles) { g[t.cell] = t; }
        return g;
    }
    function valuesOf(tiles: Tile[]): number[] {
        const v: number[] = [];
        for (let i = 0; i < CELLS; i += 1) { v.push(0); }
        for (const t of tiles) { v[t.cell] = t.v; }
        return v;
    }
    function copyTiles(tiles: Tile[]): Tile[] { return tiles.map(function (t: Tile): Tile { return { id: t.id, v: t.v, cell: t.cell }; }); }
    // 한 수 밀기 — 판을 돌려 그 방향을 왼쪽으로 만든 순서표로 네 줄을 읽고, 줄마다 compressLine 한 결과를 원래 칸 번호로 되돌려 적는다
    function slideBoard(g: Game, dir: number, lock: boolean): Move {
        const cells = gridOf(g.tiles);
        const order = ORDERS[dir];
        const byId: { [id: number]: Tile } = {};
        for (const t of g.tiles) { byId[t.id] = t; }
        const slides: Slide[] = [];
        const merges: Merge[] = [];
        const after: Tile[] = [];
        let gain = 0;
        for (let r = 0; r < SIZE; r += 1) {
            const line: (Tile | null)[] = [];
            for (let k = 0; k < SIZE; k += 1) { line.push(cells[order[r * SIZE + k]]); }
            compressLine(line, lock).forEach(function (o: LineOut, slot: number): void {
                const to = order[r * SIZE + slot];
                for (const id of o.ids) { slides.push({ id: id, v: byId[id].v, from: byId[id].cell, to: to }); }
                if (o.merged) {
                    const nid = g.nextId;
                    g.nextId += 1;
                    merges.push({ id: nid, v: o.v, cell: to, parents: o.ids.slice() });
                    after.push({ id: nid, v: o.v, cell: to });
                    gain += o.v;
                } else {
                    after.push({ id: o.ids[0], v: o.v, cell: to });
                }
            });
        }
        const moved = merges.length > 0 || slides.some(function (s: Slide): boolean { return s.from !== s.to; });
        return { dir: dir, moved: moved, slides: slides, merges: merges, gain: gain, before: copyTiles(g.tiles), after: after, spawn: null };
    }
    function emptyCells(tiles: Tile[]): number[] {
        const used: boolean[] = [];
        for (let i = 0; i < CELLS; i += 1) { used.push(false); }
        for (const t of tiles) { used[t.cell] = true; }
        const out: number[] = [];
        for (let i = 0; i < CELLS; i += 1) { if (!used[i]) { out.push(i); } }
        return out;
    }
    // 빈칸 하나를 시드 난수로 뽑아 2 또는 4 를 놓는다 — 4 는 FOUR_CHANCE 의 확률
    function spawnTile(g: Game): Tile | null {
        const empty = emptyCells(g.tiles);
        if (!empty.length) { return null; }
        const cell = empty[Math.floor(g.rng() * empty.length)];
        const v = g.rng() < FOUR_CHANCE ? 4 : 2;
        const t: Tile = { id: g.nextId, v: v, cell: cell };
        g.nextId += 1;
        g.tiles.push(t);
        return t;
    }
    // 한 수 두기 — 움직였을 때만 판을 바꾸고 새 타일을 하나 돋운다. 안 움직이는 방향은 수가 아니다(새 타일도 없음)
    function playMove(g: Game, dir: number, lock: boolean): Move {
        const mv = slideBoard(g, dir, lock);
        if (!mv.moved) { return mv; }
        g.tiles = mv.after.map(function (t: Tile): Tile { return { id: t.id, v: t.v, cell: t.cell }; });
        g.score += mv.gain;
        mv.spawn = spawnTile(g);
        return mv;
    }
    function makeGame(values: number[], seed: number): Game {
        const tiles: Tile[] = [];
        let id = 1;
        values.forEach(function (v: number, cell: number): void {
            if (v) { tiles.push({ id: id, v: v, cell: cell }); id += 1; }
        });
        return { tiles: tiles, nextId: id, score: 0, rng: makeRng(seed) };
    }
    // 가로·세로로 맞닿은 같은 값 짝 — 이 짝이 하나도 없고 빈칸도 없으면 어느 방향으로도 못 민다(판 끝)
    type Pair = { a: number; b: number };
    function equalPairs(vals: number[]): Pair[] {
        const out: Pair[] = [];
        for (let r = 0; r < SIZE; r += 1) {
            for (let c = 0; c < SIZE; c += 1) {
                const i = r * SIZE + c;
                if (!vals[i]) { continue; }
                if (c + 1 < SIZE && vals[i + 1] === vals[i]) { out.push({ a: i, b: i + 1 }); }
                if (r + 1 < SIZE && vals[i + SIZE] === vals[i]) { out.push({ a: i, b: i + SIZE }); }
            }
        }
        return out;
    }
    function countEmpty(vals: number[]): number { let n = 0; for (const v of vals) { if (!v) { n += 1; } } return n; }
    function isStuck(vals: number[]): boolean { return countEmpty(vals) === 0 && equalPairs(vals).length === 0; }
    function rowOf(cell: number): number { return Math.floor(cell / SIZE); }
    function colOf(cell: number): number { return cell % SIZE; }

    // ── 쓸기 방향 판정 ───────────────────────────────────────────
    // 시작점·끝점 차(dx, dy, 화면 px — y 는 아래로)와 걸린 시간(ms)으로 네 부채꼴 중 하나를 고르거나 버린다
    // 이 길이보다 짧은 궤적은 버린다 — 다만 FLICK_SPEED_PX_S 보다 빠르면 짧아도 받아들인다(빠른 튕김)
    const SWIPE_MIN_PX = 24;
    const FLICK_SPEED_PX_S = 450;
    // 튕김이라도 이보다 짧으면 손가락이 떨린 것으로 본다
    const FLICK_MIN_PX = 8;
    // 부채꼴 경계(45°·135°·225°·315°) 양쪽 이 각도 안은 애매한 대각선 — 버린다
    const DEAD_ZONE_DEG = 10;
    type Verdict = { dir: number; angle: number; length: number; speed: number; reason: string };
    const VERDICT_OK = 'ok';
    const VERDICT_SHORT = 'short';
    const VERDICT_DIAGONAL = 'diagonal';
    const VERDICT_FLICK = 'flick';
    // 화면 각(0° 오른쪽, 90° 아래)을 부채꼴로 — 가장 가까운 90° 배수가 방향
    const ANGLE_TO_DIR = [DIR_RIGHT, DIR_DOWN, DIR_LEFT, DIR_UP];
    function judgeSwipe(dx: number, dy: number, ms: number): Verdict {
        const length = Math.sqrt(dx * dx + dy * dy);
        const speed = length / Math.max(1, ms) * 1000;
        const angle = (deg(Math.atan2(dy, dx)) + 360) % 360;
        const base = { dir: -1, angle: angle, length: length, speed: speed, reason: VERDICT_SHORT };
        const flick = length >= FLICK_MIN_PX && speed >= FLICK_SPEED_PX_S;
        if (length < SWIPE_MIN_PX && !flick) { return base; }
        // 경계까지 남은 각 — 90° 마다 되풀이되는 자리에서 45° 와의 차
        const toBorder = Math.abs((angle % 90) - 45);
        if (toBorder < DEAD_ZONE_DEG) { base.reason = VERDICT_DIAGONAL; return base; }
        base.dir = ANGLE_TO_DIR[Math.round(angle / 90) % 4];
        base.reason = length < SWIPE_MIN_PX ? VERDICT_FLICK : VERDICT_OK;
        return base;
    }

    // ── 타일 색과 숫자 크기 ──────────────────────────────────────
    // 단계 = log2(값) — 2 는 1단계, 2048 은 11단계, 8192 는 13단계
    function stepOf(v: number): number { return v > 0 ? Math.log2(v) : 0; }
    // 파스텔 기준색과 그 색이 놓이는 단계 — 사이 단계는 oklab 에서 곧게 섞는다
    const TILE_ANCHORS: RGB[] = [[250, 238, 218], [246, 224, 150], [244, 170, 152], [244, 190, 212], [196, 182, 238], [170, 206, 238], [164, 218, 196]];
    const ANCHOR_STEPS = [1, 3, 5, 7, 9, 11, 13];
    type Lab = [number, number, number];
    function toLinear(c: number): number { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }
    function fromLinear(x: number): number { const c = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return clamp(c * 255, 0, 255); }
    // sRGB → oklab (지각 균등 색 공간 — 같은 거리만큼 섞으면 눈에도 비슷한 만큼 바뀐다)
    function rgbToOklab(c: RGB): Lab {
        const r = toLinear(c[0]);
        const g = toLinear(c[1]);
        const b = toLinear(c[2]);
        const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
    }
    function oklabToRgb(c: Lab): RGB {
        const l = Math.pow(c[0] + 0.3963377774 * c[1] + 0.2158037573 * c[2], 3);
        const m = Math.pow(c[0] - 0.1055613458 * c[1] - 0.0638541728 * c[2], 3);
        const s = Math.pow(c[0] - 0.0894841775 * c[1] - 1.2914855480 * c[2], 3);
        return [fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
            fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
    }
    const ANCHOR_LABS: Lab[] = TILE_ANCHORS.map(rgbToOklab);
    // 단계(소수 가능)의 색 — 양옆 기준 단계 사이 몫 k 로 oklab 세 값을 각각 곧게 섞는다(선형 보간). 끝 바깥은 끝 색
    function tileColor(step: number): RGB {
        const last = ANCHOR_STEPS.length - 1;
        if (step <= ANCHOR_STEPS[0]) { return TILE_ANCHORS[0]; }
        if (step >= ANCHOR_STEPS[last]) { return TILE_ANCHORS[last]; }
        let i = 0;
        while (step > ANCHOR_STEPS[i + 1]) { i += 1; }
        const k = (step - ANCHOR_STEPS[i]) / (ANCHOR_STEPS[i + 1] - ANCHOR_STEPS[i]);
        const a = ANCHOR_LABS[i];
        const b = ANCHOR_LABS[i + 1];
        return oklabToRgb([lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]);
    }
    // 비교용 — 같은 두 색을 sRGB 값 그대로 섞은 색
    function tileColorRgb(step: number): RGB {
        const last = ANCHOR_STEPS.length - 1;
        if (step <= ANCHOR_STEPS[0]) { return TILE_ANCHORS[0]; }
        if (step >= ANCHOR_STEPS[last]) { return TILE_ANCHORS[last]; }
        let i = 0;
        while (step > ANCHOR_STEPS[i + 1]) { i += 1; }
        const k = (step - ANCHOR_STEPS[i]) / (ANCHOR_STEPS[i + 1] - ANCHOR_STEPS[i]);
        return mix(TILE_ANCHORS[i], TILE_ANCHORS[i + 1], k);
    }
    // 숫자 크기 맞춤 — 칸 폭 × DIGIT_PX_RATIO 로 시작해, 잰 숫자 폭이 칸 폭 × DIGIT_FILL 을 넘으면 그 비율만큼 줄인다
    const DIGIT_PX_RATIO = 0.5;
    const DIGIT_FILL = 0.8;
    const DIGIT_WEIGHT = 800;
    type DigitFit = { px: number; width: number; rawWidth: number; scale: number };
    function fitDigits(text: string, cell: number, m: Measure): DigitFit {
        const px0 = cell * DIGIT_PX_RATIO;
        const raw = textWidth(text, px0, DIGIT_WEIGHT, m);
        const room = cell * DIGIT_FILL;
        const scale = raw > room ? room / raw : 1;
        return { px: px0 * scale, width: raw * scale, rawWidth: raw, scale: scale };
    }

    // ── 화면 타일 — 논리 판과 따로, 미끄러지는 동안의 자리와 크기를 든다 ──
    // 자리는 (열, 행) 소수 좌표. 시각은 모두 장면 시계(초)
    type Sprite = {
        id: number; v: number;
        fx: number; fy: number; tx: number; ty: number;
        t0: number; dur: number;
        show: number; hide: number;
        pop: Spring;
        squash: Spring;
        axis: number;
        landed: boolean;
        lockUntil: number;
    };
    // 미끄러짐 모양 — 걸리는 시간 = base + perCell × (칸 수 − 1). easeIn 이면 점점 빨라져 벽에 빠르게 닿는다(아니면 부드럽게 서서 멈춤)
    type SlideStyle = { base: number; perCell: number; easeIn: boolean };
    type View = { sprites: Sprite[]; style: SlideStyle };
    // 합친 타일 크기 스프링 — 크기 1 에서 POP_KICK(1/초)의 속도로 차올라 넘쳤다가 1 로 앉는다. 새 타일은 0 에서 자란다
    const POP_STIFFNESS = 420;
    const POP_DAMPING = 18;
    const POP_KICK = 6;
    // 새 타일은 미끄러짐이 다 끝난 뒤 이만큼 있다가 돋는다
    const SPAWN_DELAY_S = 0.04;
    // 되감기 때 새 타일이 오그라들어 사라지는 데 쓰는 시간
    const SHRINK_S = 0.22;
    // 숨는 시각이 없는 타일 — 아주 먼 뒤
    const NO_HIDE = 1e9;
    function makeSprite(t: Tile, show: number): Sprite {
        const c = colOf(t.cell);
        const r = rowOf(t.cell);
        return { id: t.id, v: t.v, fx: c, fy: r, tx: c, ty: r, t0: 0, dur: 0, show: show, hide: NO_HIDE, pop: makeSpring(1), squash: makeSpring(0), axis: 0, landed: true, lockUntil: -1 };
    }
    function makeView(tiles: Tile[], style: SlideStyle): View {
        return { sprites: tiles.map(function (t: Tile): Sprite { return makeSprite(t, -1); }), style: style };
    }
    // 판 그대로 다시 놓기 — 움직임 줄이기·사람 수를 멈춘 화면에서 바로 보일 때
    function settleView(view: View, tiles: Tile[]): void {
        view.sprites = tiles.map(function (t: Tile): Sprite { return makeSprite(t, -1); });
    }
    function slideTime(style: SlideStyle, cells: number): number { return cells > 0 ? style.base + style.perCell * (cells - 1) : 0; }
    function findSprite(view: View, id: number): Sprite | null {
        for (const s of view.sprites) { if (s.id === id && s.hide >= NO_HIDE) { return s; } }
        return null;
    }
    function aimSprite(s: Sprite, from: number, to: number, t: number, style: SlideStyle): void {
        s.fx = colOf(from); s.fy = rowOf(from); s.tx = colOf(to); s.ty = rowOf(to);
        const cells = Math.abs(s.tx - s.fx) + Math.abs(s.ty - s.fy);
        s.axis = s.fx !== s.tx ? 0 : 1;
        s.t0 = t;
        s.dur = slideTime(style, cells);
        s.landed = cells === 0;
    }
    // 한 수를 화면 타일로 — 미끄러짐 시작 t. 합친 타일은 마지막 부모가 닿는 순간 나타나 스프링으로 부풀고, 새 타일은 그 뒤에 돋는다. 끝나는 시각을 돌려준다
    function animateMove(view: View, mv: Move, t: number, lockS: number): number {
        let end = t;
        const arrive: { [id: number]: number } = {};
        for (const sl of mv.slides) {
            let s = findSprite(view, sl.id);
            if (!s) { s = makeSprite({ id: sl.id, v: sl.v, cell: sl.from }, -1); view.sprites.push(s); }
            aimSprite(s, sl.from, sl.to, t, view.style);
            arrive[sl.id] = t + s.dur;
            end = Math.max(end, t + s.dur);
        }
        for (const m of mv.merges) {
            let at = t;
            for (const p of m.parents) { at = Math.max(at, arrive[p]); }
            for (const p of m.parents) { const s = findSprite(view, p); if (s) { s.hide = at; } }
            const born = makeSprite({ id: m.id, v: m.v, cell: m.cell }, at);
            born.pop.v = POP_KICK;
            born.lockUntil = at + lockS;
            view.sprites.push(born);
        }
        if (mv.spawn) {
            const sp = makeSprite(mv.spawn, end + SPAWN_DELAY_S);
            snapSpring(sp.pop, 0);
            sp.pop.to = 1;
            view.sprites.push(sp);
        }
        return end + SPAWN_DELAY_S;
    }
    // 되감기 — 기록을 거꾸로: 새 타일은 오그라들어 사라지고, 합친 타일은 그 자리에서 두 부모로 갈라져 각자 출발 칸으로 미끄러져 간다
    function animateUndo(view: View, mv: Move, t: number): number {
        let end = t;
        if (mv.spawn) {
            const s = findSprite(view, mv.spawn.id);
            if (s) { s.pop.to = 0; s.hide = t + SHRINK_S; }
            end = t + SHRINK_S;
        }
        const merged: { [id: number]: boolean } = {};
        for (const m of mv.merges) {
            const s = findSprite(view, m.id);
            if (s) { s.hide = t; }
            for (const p of m.parents) { merged[p] = true; }
        }
        for (const sl of mv.slides) {
            let s = merged[sl.id] ? null : findSprite(view, sl.id);
            if (!s) { s = makeSprite({ id: sl.id, v: sl.v, cell: sl.to }, t); view.sprites.push(s); }
            aimSprite(s, sl.to, sl.from, t, view.style);
            end = Math.max(end, t + s.dur);
        }
        return end;
    }
    // 진행 몫 u(0~1)의 자리 몫과, 그때 1초에 가는 칸 수
    function slideAt(s: Sprite, t: number, easeIn: boolean): { x: number; y: number; speed: number } {
        const cells = Math.abs(s.tx - s.fx) + Math.abs(s.ty - s.fy);
        if (s.dur <= 0 || t >= s.t0 + s.dur) { return { x: s.tx, y: s.ty, speed: 0 }; }
        const u = clamp((t - s.t0) / s.dur, 0, 1);
        const k = easeIn ? u * u : smooth(u);
        const dk = easeIn ? 2 * u : 6 * u * (1 - u);
        return { x: lerp(s.fx, s.tx, k), y: lerp(s.fy, s.ty, k), speed: dk * cells / s.dur };
    }
    // 미끄러짐이 끝난 순간(착지) — 그 직전 속도와 함께 알린다. 크기 스프링도 여기서 한 걸음
    type Landing = { s: Sprite; speed: number };
    function stepView(view: View, t: number, dt: number): Landing[] {
        const out: Landing[] = [];
        for (const s of view.sprites) {
            if (t < s.show) { continue; }
            stepSpring(s.pop, POP_STIFFNESS, POP_DAMPING, dt);
            if (!s.landed && t >= s.t0 + s.dur) {
                s.landed = true;
                const cells = Math.abs(s.tx - s.fx) + Math.abs(s.ty - s.fy);
                out.push({ s: s, speed: view.style.easeIn ? 2 * cells / s.dur : 0 });
            }
        }
        view.sprites = view.sprites.filter(function (s: Sprite): boolean { return t < s.hide; });
        return out;
    }
    function viewBusy(view: View, t: number): boolean {
        for (const s of view.sprites) { if (t < s.t0 + s.dur || (s.show > t)) { return true; } }
        return false;
    }

    // ── 판 하나 = 논리 판 + 화면 타일 + 입력 대기열 ─────────────
    // 미끄러지는 동안 들어온 입력은 대기열에 넣었다가 미끄러짐이 끝나면 둔다. 대기열이 꽉 차 있으면 그 입력은 버린다
    const INPUT_QUEUE_MAX = 1;
    type Player = {
        game: Game; view: View; lock: boolean; lockS: number;
        queue: number[]; queueMax: number; busyUntil: number;
        last: Move | null; history: Move[];
        got: number; played: number; dropped: number;
    };
    function makePlayer(values: number[], seed: number, style: SlideStyle, lock: boolean, lockS: number): Player {
        const g = makeGame(values, seed);
        return { game: g, view: makeView(g.tiles, style), lock: lock, lockS: lockS, queue: [], queueMax: INPUT_QUEUE_MAX, busyUntil: -1, last: null, history: [], got: 0, played: 0, dropped: 0 };
    }
    // 지금 바로 한 수 — 안 움직이는 방향이면 판도 기록도 그대로
    function doMove(p: Player, dir: number, t: number): Move {
        const mv = playMove(p.game, dir, p.lock);
        p.last = mv;
        if (!mv.moved) { return mv; }
        p.busyUntil = animateMove(p.view, mv, t, p.lockS);
        p.history.push(mv);
        p.played += 1;
        return mv;
    }
    // 입력 하나 — 미끄러지는 중이면 대기열에, 대기열이 꽉 찼으면 버린다. 둔 수가 있으면 돌려준다
    function pushInput(p: Player, dir: number, t: number): Move | null {
        p.got += 1;
        if (t < p.busyUntil) {
            if (p.queue.length < p.queueMax) { p.queue.push(dir); } else { p.dropped += 1; }
            return null;
        }
        return doMove(p, dir, t);
    }
    // 미끄러짐이 끝났으면 대기열 맨 앞 입력을 둔다
    function pumpQueue(p: Player, t: number): Move | null {
        if (t < p.busyUntil || !p.queue.length) { return null; }
        const dir = p.queue.shift();
        return dir === undefined ? null : doMove(p, dir, t);
    }
    function settlePlayer(p: Player): void {
        settleView(p.view, p.game.tiles);
        p.busyUntil = -1;
        p.queue = [];
    }
    function maxTile(p: Player): number { let m = 0; for (const t of p.game.tiles) { m = Math.max(m, t.v); } return m; }
    // 상태 줄 — 둔 방향 · 이번 수에 합친 횟수 · 점수
    const STATUS_MOVE = '{d} · 합침 {m} · 점수 {s}';
    const STATUS_BLOCKED = '{d} — 움직일 타일 없음';
    function moveStatus(p: Player, mv: Move): string {
        if (!mv.moved) { return STATUS_BLOCKED.replace('{d}', DIR_NAMES[mv.dir]); }
        return STATUS_MOVE.replace('{d}', DIR_NAMES[mv.dir]).replace('{m}', String(mv.merges.length)).replace('{s}', String(p.game.score));
    }
    const canvasEl = root.querySelector('[data-role="canvas"]') as HTMLCanvasElement | null;
    const boardEl = root.querySelector('[data-role="board"]') as HTMLElement | null;
    const pauseEl = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    const statusEl = root.querySelector('[data-role="status"]') as HTMLElement | null;
    const ctxRaw = canvasEl ? canvasEl.getContext('2d') : null;
    if (!canvasEl || !ctxRaw || !pauseEl || !boardEl) { return; }
    const cv: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctxRaw;
    const pauseBtn: HTMLButtonElement = pauseEl;
    const boardBox: HTMLElement = boardEl;
    // 외부 웹폰트는 부르지 않는다 — 기기에 있는 글꼴 목록만
    const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
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
    function line(x1: number, y1: number, x2: number, y2: number, width: number, c: RGB, a: number): void {
        if (a <= 0) { return; }
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.strokeStyle = rgba(c, a);
        ctx.stroke();
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

    // ── 판·타일 그리기 ───────────────────────────────────────────
    // 판 자리 — 왼쪽 위 (x, y), 칸 한 변 cell, 칸 사이 gap
    type Frame = { x: number; y: number; cell: number; gap: number };
    function frameSize(f: Frame): number { return SIZE * f.cell + (SIZE + 1) * f.gap; }
    function cellCenter(f: Frame, col: number, row: number): [number, number] {
        return [f.x + f.gap + col * (f.cell + f.gap) + f.cell / 2, f.y + f.gap + row * (f.cell + f.gap) + f.cell / 2];
    }
    function drawBoardBack(f: Frame, a: number): void {
        const s = frameSize(f);
        fillRound(f.x, f.y, s, s, f.cell * 0.16, BOARD_BG, a);
        for (let r = 0; r < SIZE; r += 1) {
            for (let c = 0; c < SIZE; c += 1) {
                const p = cellCenter(f, c, r);
                fillRound(p[0] - f.cell / 2, p[1] - f.cell / 2, f.cell, f.cell, f.cell * 0.12, CELL_BG, a);
            }
        }
    }
    // 타일 하나 — 가운데 (cx, cy), 한 변 size, 가로·세로 배율 sx·sy, 색 단계 step(소수면 두 색 사이). fit 이 거짓이면 숫자를 줄이지 않는다(넘치는 판)
    function drawTileAt(v: number, cx: number, cy: number, size: number, sx: number, sy: number, a: number, step: number, fit: boolean): void {
        if (a <= 0.01 || sx <= 0.01 || sy <= 0.01) { return; }
        const w = size * sx;
        const h = size * sy;
        fillRound(cx - w / 2, cy - h / 2, w, h, size * 0.12, tileColor(step), a);
        const text = String(v);
        const f = fitDigits(text, size, glyphWidth);
        const px = fit ? f.px : size * DIGIT_PX_RATIO;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sx, sy);
        setFont(px, DIGIT_WEIGHT, FONT_STACK);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(INK, a);
        ctx.fillText(text, 0, px * 0.04);
        ctx.restore();
    }
    // 화면 타일 전부 — 미끄러짐 모양은 view.style, 늘임은 stretch 가 정한다(가로 배율, 세로 배율을 돌려줌)
    type Stretch = (s: Sprite, speed: number) => [number, number];
    function noStretch(s: Sprite, speed: number): [number, number] { void s; void speed; return [1, 1]; }
    function drawView(view: View, f: Frame, t: number, a: number, stretch: Stretch): void {
        // 미끄러지는 타일을 나중에 — 서 있는 타일 위로 지나가게
        const order = view.sprites.filter(function (s: Sprite): boolean { return t >= s.show; });
        order.sort(function (p: Sprite, q: Sprite): number { return (p.landed ? 0 : 1) - (q.landed ? 0 : 1); });
        for (const s of order) {
            const at = slideAt(s, t, view.style.easeIn);
            const p = cellCenter(f, at.x, at.y);
            const k = Math.max(0, s.pop.x);
            const st = stretch(s, at.speed);
            drawTileAt(s.v, p[0], p[1], f.cell, k * st[0], k * st[1], a, stepOf(s.v), true);
            if (t < s.lockUntil) {
                // 잠금 표시 — 이번 수에 합쳐진 타일. 같은 수 안에서는 다시 합치지 않는다
                ctx.lineWidth = 2;
                ctx.strokeStyle = rgba(VIOLET_DEEP, a * 0.9);
                roundRectPath(p[0] - f.cell * 0.5 * k - 3, p[1] - f.cell * 0.5 * k - 3, f.cell * k + 6, f.cell * k + 6, f.cell * 0.16);
                ctx.stroke();
            }
        }
    }
    // 05 — 2의 거듭제곱 단계로 고르는 색과 숫자 크기 맞춤. 값이 2 에서 8192 까지 두 배씩 오를 때 단계(log2)가 1씩 오르고,
    // 보이는 단계는 COLOR_RATE 로 따라가 색이 oklab 에서 섞이며 넘어간다(tileColor). 숫자는 fitDigits 가 잰 폭으로 줄인다
    const TOP_STEP = 13;
    const RAMP_START_S = 0.2;
    const RAMP_STEP_S = 0.15;
    const RAMP_HOLD_S = 0.6;
    const LOOP_S = RAMP_START_S + (TOP_STEP - 1) * RAMP_STEP_S + RAMP_HOLD_S;
    // 보이는 단계가 목표 단계를 따라가는 빠르기(1/초) — 1 − e^(−COLOR_RATE·dt)
    const COLOR_RATE = 14;
    // 단계가 오를 때 타일이 살짝 부푸는 스프링
    const STEP_KICK = 2.4;
    let step05 = 1;
    let shown05 = 1;
    const pop05 = makeSpring(1);
    function value05(): number { return Math.pow(2, step05); }
    function reset(): void {
        step05 = 1;
        shown05 = 1;
        snapSpring(pop05, 1);
        simStatus = statusFor05();
    }
    function relayout(): void { }
    const STATUS_STEP = '{v} · {k}단계 · 글자 {p}px';
    function statusFor05(): string {
        const f = fitDigits(String(value05()), BIG_05, glyphWidth);
        return STATUS_STEP.replace('{v}', String(value05())).replace('{k}', String(step05)).replace('{p}', f.px.toFixed(1));
    }
    // 큰 타일 한 변 — 화면과 계산이 같이 쓴다
    const BIG_05 = 150;
    function setStep05(k: number): void {
        const n = clamp(k, 1, TOP_STEP);
        if (n === step05) { return; }
        step05 = n;
        pop05.v += STEP_KICK;
        simStatus = statusFor05();
    }
    // 위·오른쪽 = 한 단계 올림, 아래·왼쪽 = 한 단계 내림
    function humanMove(dir: number): void { setStep05(step05 + (dir === DIR_UP || dir === DIR_RIGHT ? 1 : -1)); }
    function onSwipe(v: Verdict): void { if (v.dir >= 0) { humanMove(v.dir); } }
    function update(dt: number): void {
        if (autoOn && sceneT >= RAMP_START_S) {
            setStep05(1 + Math.min(TOP_STEP - 1, Math.floor((sceneT - RAMP_START_S) / RAMP_STEP_S) + 1));
        }
        shown05 += (step05 - shown05) * follow(COLOR_RATE, dt);
        pop05.to = 1;
        stepSpring(pop05, POP_STIFFNESS, POP_DAMPING, dt);
    }
    function settle(): void { shown05 = step05; snapSpring(pop05, 1); }
    // 정지 판 — 네 자리 1024(10단계)
    function restPose(): void {
        step05 = 10;
        settle();
        simStatus = statusFor05();
    }
    // 05 화면 — 왼쪽 큰 타일(지금 단계의 색·맞춘 숫자)과 그 아래 단계 띠 두 줄(oklab 섞기 · 비교용 sRGB 섞기),
    // 오른쪽에 같은 값을 맞춤 있이·없이 그린 두 타일 — 맞춤 없는 쪽은 넘친 폭을 산호 막대로
    const BIG_X = 112;
    const BIG_Y = 106;
    const SMALL_05 = 86;
    const FIT_X = 304;
    const RAW_X = 412;
    const PAIR_Y = 106;
    const BAND_X0 = 22;
    const BAND_X1 = 202;
    const LABEL_FIT = '맞춤';
    const LABEL_RAW = '맞춤 없음';
    const LABEL_FIT_PX = '{p}px · {k}%';
    const LABEL_OVER = '넘침 {o}px';
    const LABEL_OKLAB = 'oklab 섞기';
    const LABEL_SRGB = 'sRGB 섞기';
    function bindInput(signal: AbortSignal): void { void signal; }
    function band05(y: number, h: number, pick: (s: number) => RGB): void {
        const n = 90;
        for (let i = 0; i < n; i += 1) {
            const s = 1 + (TOP_STEP - 1) * i / (n - 1);
            ctx.fillStyle = rgba(pick(s), 1);
            ctx.fillRect(lerp(BAND_X0, BAND_X1, i / n), y, (BAND_X1 - BAND_X0) / n + 0.6, h);
        }
    }
    function draw(): void {
        clearStage(PAPER);
        const v = value05();
        const k = pop05.x;
        drawTileAt(v, BIG_X, BIG_Y, BIG_05, k, k, 1, shown05, true);
        // 단계 띠 — 1 에서 13 단계, 지금 보이는 단계에 표시
        band05(198, 14, tileColor);
        band05(222, 10, tileColorRgb);
        const mx = lerp(BAND_X0, BAND_X1, (shown05 - 1) / (TOP_STEP - 1));
        line(mx, 192, mx, 236, 2.5, INK, 0.9);
        label(LABEL_OKLAB, BAND_X1 + 6, 205, INK, 1, 9, 700, 'left');
        label(LABEL_SRGB, BAND_X1 + 6, 227, INK_SOFT, 1, 9, 700, 'left');
        // 맞춤 있는 타일 · 없는 타일
        const f = fitDigits(String(v), SMALL_05, glyphWidth);
        pill(LABEL_FIT, FIT_X, 40, CREAM, MINT_DEEP, 1, 10);
        pill(LABEL_RAW, RAW_X, 40, CREAM, CORAL_DEEP, 1, 10);
        drawTileAt(v, FIT_X, PAIR_Y, SMALL_05, 1, 1, 1, shown05, true);
        drawTileAt(v, RAW_X, PAIR_Y, SMALL_05, 1, 1, 1, shown05, false);
        label(LABEL_FIT_PX.replace('{p}', f.px.toFixed(1)).replace('{k}', String(Math.round(f.scale * 100))), FIT_X, 166, MINT_DEEP, 1, 10, 700, 'center');
        // 줄이지 않은 숫자 폭(칸 × DIGIT_PX_RATIO 크기)이 칸 폭을 넘은 양
        const over = Math.max(0, f.rawWidth - SMALL_05);
        if (over > 0) {
            // 칸 밖으로 나간 양쪽 끝 — 숫자 폭 − 칸 폭 을 반씩
            const half = over / 2;
            fillRound(RAW_X - SMALL_05 / 2 - half, PAIR_Y + 30, half, 5, 2, CORAL_DEEP, 0.9);
            fillRound(RAW_X + SMALL_05 / 2, PAIR_Y + 30, half, 5, 2, CORAL_DEEP, 0.9);
        }
        label(LABEL_OVER.replace('{o}', over.toFixed(1)), RAW_X, 166, CORAL_DEEP, 1, 10, 700, 'center');
    }
    let paused = false;
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // 페이지를 연 채 동작 줄이기 설정을 바꿔도 change 리스너가 이 값을 다시 읽는다
    let still = reduceQuery.matches;
    // 자동 시연 표시가 붙어 있는가 — 사람이 처음 손대면 표시를 떼고 상태 줄을 polite 로 켠다
    let demo = root.classList.contains('is-demo');
    // 리스너는 한 묶음으로 달고 정리할 때 한 번에 뗀다
    const off = new AbortController();
    function wake(): void {
        if (!demo) { return; }
        demo = false;
        root.classList.remove('is-demo');
        if (statusEl) { statusEl.setAttribute('aria-live', 'polite'); }
    }
    // 사람이 한 수를 두면 자동 시연은 수를 그만 두고, 판은 그 자리에서 사람 판이 된다
    function takeOver(): void {
        wake();
        autoOn = false;
    }
    // 멈춘 화면(움직임 줄이기·일시정지)에서 둔 수는 미끄러짐 없이 결과 판으로 바로 그린다
    function showNow(): void {
        if (still || paused) {
            settle();
            draw();
            pushStatus();
        }
    }
    // 한 프레임에 넘기는 시간 상한(초) — 탭을 오래 숨겼다 돌아온 첫 프레임에도 50ms 까지만 계산에 넣는다
    const DT_MAX = 0.05;
    // 장면 시계를 dt 만큼 — 자동 시연 중에는 한 바퀴(LOOP_S)를 넘으면 처음 판으로 되돌려 다시 시연한다
    function advance(dt: number): void {
        sceneT += dt;
        if (autoOn && sceneT >= LOOP_S) {
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
    // 동작 줄이기 — 루프를 돌리지 않고 정지 판 한 장만 그린다
    function showRest(): void {
        stopLoop();
        if (autoOn) {
            sceneT = 0;
            reset();
            restPose();
        } else {
            settle();
        }
        draw();
        pushStatus();
    }
    function play(): void {
        if (autoOn) {
            sceneT = 0;
            reset();
        }
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
    // 방향키 — 판에 포커스가 있을 때만 받는다. 판 밖에서는 화살표가 원래대로 페이지를 스크롤한다
    const KEY_DIRS: { [key: string]: number } = { ArrowLeft: DIR_LEFT, ArrowUp: DIR_UP, ArrowRight: DIR_RIGHT, ArrowDown: DIR_DOWN };
    boardBox.addEventListener('keydown', function (e: KeyboardEvent): void {
        const dir = KEY_DIRS[e.key];
        if (dir === undefined || e.altKey || e.ctrlKey || e.metaKey) { return; }
        e.preventDefault();
        takeOver();
        humanMove(dir);
        showNow();
    }, { signal: off.signal });
    // 쓸기 — 누른 자리와 뗀 자리의 차, 걸린 시간을 쓸기 판정(judgeSwipe)에 넣는다. 화면 px 그대로
    let downX = 0;
    let downY = 0;
    let downT = -1;
    boardBox.addEventListener('pointerdown', function (e: PointerEvent): void {
        downX = e.clientX;
        downY = e.clientY;
        downT = e.timeStamp;
    }, { signal: off.signal });
    boardBox.addEventListener('pointerup', function (e: PointerEvent): void {
        if (downT < 0) { return; }
        const v = judgeSwipe(e.clientX - downX, e.clientY - downY, e.timeStamp - downT);
        downT = -1;
        if (v.length < FLICK_MIN_PX) { return; }
        takeOver();
        onSwipe(v);
        showNow();
    }, { signal: off.signal });
    boardBox.addEventListener('pointercancel', function (): void { downT = -1; }, { signal: off.signal });
    // 탭이 숨으면 루프를 멈추고, 돌아오면 시계를 다시 맞춰 시작한다 — 숨은 동안의 몇 초가 한 프레임에 몰리지 않게
    document.addEventListener('visibilitychange', function (): void {
        if (document.hidden) { stopLoop(); } else if (!paused && !still && fontsReady) { startLoop(); }
    }, { signal: off.signal });
    // 설정이 페이지를 연 채 바뀌면 — 켜지면 정지 판으로 멈추고, 꺼지면 다시 움직인다
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
    // 숫자 폭은 글꼴이 다 온 뒤에 잰다 — 그 전에 잰 폭은 대체 글꼴의 폭이라 글꼴이 바뀌는 순간 글자 크기 맞춤이 틀어진다.
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
        <div className={cx("cf__board")} data-role="board" tabIndex={0} role="application" aria-label={'2048 타일 — 위·오른쪽 화살표로 단계 올리기, 아래·왼쪽으로 내리기'}>
          <canvas className={cx("cf__canvas")} data-role="canvas" width={480} height={300} aria-hidden={true}></canvas>
        </div>
        <p className={cx("cf__sr")}>{'2 에서 8192 까지 값이 두 배씩 오를 때 타일 색이 oklab 에서 섞여 넘어가고 숫자가 칸에 맞게 줄며, 줄이지 않은 타일은 칸을 넘친다'}</p>
        <p className={cx("cf__status")} data-role="status" aria-live="off">{'단계를 올리는 중'}</p>
        <button className={cx("cf__pause")} data-role="pause" type="button" aria-pressed="false">{'일시정지'}</button>
    </div>
  );
}
