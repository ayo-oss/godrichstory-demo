// MzDistanceBfsFloodHeat - vanilla 판(05-mz-distance-bfs-flood-heat) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./MzDistanceBfsFloodHeat.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function MzDistanceBfsFloodHeat() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    if (!rootEl) return;
    const root: HTMLElement = rootEl;
    type RGB = [number, number, number];
    const W = 480;
    const H = 300;
    const FIXED_DT = 16;
    // 파스텔 팔레트 — 어두운 무대 위에 밝은 바닥을 얹어 명도 차로 길이 읽힌다
    const BG: RGB = [29, 26, 44];
    const ROCK: RGB = [44, 39, 64];
    const PAPER: RGB = [255, 248, 234];
    const INK: RGB = [58, 48, 76];
    const MINT: RGB = [126, 226, 192];
    const SKY: RGB = [124, 196, 255];
    const LILAC: RGB = [190, 164, 255];
    const PINK: RGB = [255, 160, 190];
    const PEACH: RGB = [255, 208, 168];
    function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : (v > hi ? hi : v); }
    function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }
    function smooth(x: number): number { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); }
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
    // 시드 고정 난수 — 같은 시드면 같은 미로가 다시 나온다 (32비트 정수 섞기)
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
    // 격자 — 31×31 칸, 칸마다 벽 네 장을 비트 하나씩으로 든다
    const GRID_N = 31;
    const CELL_N = GRID_N * GRID_N;
    const CS = 9;
    const BOARD = GRID_N * CS;
    let BX = W - 12 - BOARD;
    const BY = (H - BOARD) / 2;
    const ENTRY = 0;
    const EXIT = CELL_N - 1;
    // 방향 0 북 · 1 동 · 2 남 · 3 서 — 시계 방향 순서라 +1 이 오른쪽으로 돌기, +3 이 왼쪽으로 돌기
    const DX = [0, 1, 0, -1];
    const DY = [-1, 0, 1, 0];
    const BIT = [1, 2, 4, 8];
    const ALL_WALLS = 15;
    function neighbor(i: number, d: number): number {
        const x = (i % GRID_N) + DX[d];
        const y = Math.floor(i / GRID_N) + DY[d];
        return x < 0 || y < 0 || x >= GRID_N || y >= GRID_N ? -1 : y * GRID_N + x;
    }
    function isOpen(walls: Uint8Array, i: number, d: number): boolean {
        return (walls[i] & BIT[d]) === 0 && neighbor(i, d) >= 0;
    }
    // 벽 한 장 걷기 — 양쪽 칸의 비트를 함께 지운다 (한쪽만 지우면 길이 일방통행이 된다)
    function knock(walls: Uint8Array, i: number, d: number): number {
        const n = neighbor(i, d);
        walls[i] &= ~BIT[d];
        walls[n] &= ~BIT[(d + 2) % 4];
        return n;
    }
    function openCount(walls: Uint8Array, i: number): number {
        let c = 0;
        for (let d = 0; d < 4; d += 1) { if (isOpen(walls, i, d)) { c += 1; } }
        return c;
    }
    function cellX(i: number): number { return BX + (i % GRID_N) * CS; }
    function cellY(i: number): number { return BY + Math.floor(i / GRID_N) * CS; }
    function cellAt(sx: number, sy: number): number {
        const x = Math.floor((sx - BX) / CS);
        const y = Math.floor((sy - BY) / CS);
        return x < 0 || y < 0 || x >= GRID_N || y >= GRID_N ? -1 : y * GRID_N + x;
    }
    function fillCell(i: number, c: RGB, a: number): void {
        ctx.fillStyle = rgba(c, a);
        ctx.fillRect(cellX(i), cellY(i), CS, CS);
    }
    // 벽 비트를 선분으로 — 칸마다 동·남 벽만 긋고 맨 윗줄·맨 왼줄만 북·서 벽을 더 긋는다 (같은 벽을 두 번 긋지 않는다)
    function strokeWalls(walls: Uint8Array, color: string, lw: number): void {
        ctx.beginPath();
        for (let i = 0; i < CELL_N; i += 1) {
            const x = cellX(i);
            const y = cellY(i);
            const w = walls[i];
            if ((w & 2) !== 0) { ctx.moveTo(x + CS, y); ctx.lineTo(x + CS, y + CS); }
            if ((w & 4) !== 0) { ctx.moveTo(x, y + CS); ctx.lineTo(x + CS, y + CS); }
            if (i < GRID_N && (w & 1) !== 0) { ctx.moveTo(x, y); ctx.lineTo(x + CS, y); }
            if (i % GRID_N === 0 && (w & 8) !== 0) { ctx.moveTo(x, y); ctx.lineTo(x, y + CS); }
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'square';
        ctx.stroke();
    }
    // 입구(왼쪽 위)·출구(오른쪽 아래) 표시 — 바깥 벽 밖에 작은 삼각형
    function drawGates(): void {
        ctx.fillStyle = rgba(MINT, 0.95);
        ctx.beginPath();
        ctx.moveTo(BX - 9, BY + 1);
        ctx.lineTo(BX - 2, BY + CS / 2);
        ctx.lineTo(BX - 9, BY + CS - 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = rgba(PINK, 0.95);
        ctx.beginPath();
        ctx.moveTo(BX + BOARD + 2, BY + BOARD - CS + 1);
        ctx.lineTo(BX + BOARD + 9, BY + BOARD - CS / 2);
        ctx.lineTo(BX + BOARD + 2, BY + BOARD - 1);
        ctx.closePath();
        ctx.fill();
    }
    // 왼쪽 칸의 수치 — 이름표 한 줄 + 값 한 줄
    function panelRow(row: number, label: string, value: string): void {
        const y = 104 + row * 34;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = rgba(PAPER, 0.62);
        ctx.font = '500 11px sans-serif';
        ctx.fillText(label, 16, y);
        ctx.fillStyle = rgba(PAPER, 0.96);
        ctx.font = '700 15px sans-serif';
        ctx.fillText(value, 16, y + 18);
    }
    function clearStage(): void {
        ctx.fillStyle = rgba(BG, 1);
        ctx.fillRect(0, 0, W, H);
    }
    type PickMode = 'random' | 'newest' | 'oldest';
    type Grower = { walls: Uint8Array; inMaze: Uint8Array; inFront: Uint8Array; front: number[]; order: Int32Array; count: number; last: number; rnd: () => number };
    function addFront(g: Grower, c: number): void {
        for (let d = 0; d < 4; d += 1) {
            const n = neighbor(c, d);
            if (n < 0 || g.inMaze[n] === 1 || g.inFront[n] === 1) { continue; }
            g.inFront[n] = 1;
            g.front.push(n);
        }
    }
    function growStart(seed: number, start: number): Grower {
        const g: Grower = { walls: new Uint8Array(CELL_N).fill(ALL_WALLS), inMaze: new Uint8Array(CELL_N), inFront: new Uint8Array(CELL_N), front: [], order: new Int32Array(CELL_N).fill(-1), count: 0, last: start, rnd: makeRng(seed) };
        g.inMaze[start] = 1;
        g.order[start] = 0;
        g.count = 1;
        addFront(g, start);
        return g;
    }
    // 프론티어(판 영역에 닿은 안 판 칸)에서 하나를 골라 이미 판 이웃 하나와 벽 한 장으로 잇는다
    function growOne(g: Grower, mode: PickMode): number {
        const len = g.front.length;
        if (len === 0) { return -1; }
        let c = 0;
        if (mode === 'newest') {
            c = g.front.pop() as number;
        } else if (mode === 'oldest') {
            c = g.front.shift() as number;
        } else {
            const k = Math.floor(g.rnd() * len);
            c = g.front[k];
            g.front[k] = g.front[len - 1];
            g.front.pop();
        }
        g.inFront[c] = 0;
        const links: number[] = [];
        for (let d = 0; d < 4; d += 1) {
            const n = neighbor(c, d);
            if (n >= 0 && g.inMaze[n] === 1) { links.push(d); }
        }
        knock(g.walls, c, links[Math.floor(g.rnd() * links.length)]);
        g.inMaze[c] = 1;
        g.order[c] = g.count;
        g.count += 1;
        g.last = c;
        addFront(g, c);
        return c;
    }
    function growAll(seed: number, start: number, mode: PickMode): Uint8Array {
        const g = growStart(seed, start);
        while (growOne(g, mode) >= 0) { /* 프론티어가 빌 때까지 */ }
        return g.walls;
    }
    // 한 겹(같은 거리의 칸들)을 번지는 데 쓰는 시간
    const FLOOD_STEP_MS = 20;
    // 열지도 눈금의 바닥 — 파도가 이 거리를 넘기 전까지는 눈금을 이 값으로 고정해 초반 색이 출렁이지 않게 한다
    const HEAT_MAX_D = 60;
    // 지금 막 닿은 겹(파도 앞머리)을 덮는 밝기
    const RING_ALPHA = 0.85;
    const SEED = 464;
    const HOLD_MS = 1400;
    const GAP_MS = 500;
    const HEAT_RAMP: RGB[] = [SKY, MINT, PEACH, PINK];
    const TXT_FLOOD = '입구에서 한 겹씩 번지는 중';
    const TXT_FLOOD2 = '가장 먼 방에서 다시 번지는 중';
    const TXT_DONE1 = '끝 — 가장 먼 방을 찾음';
    const TXT_DONE2 = '끝 — 서로 가장 먼 두 방을 찾음';
    const farBtn = root.querySelector('[data-role="far"]') as HTMLButtonElement | null;
    const newBtn = root.querySelector('[data-role="new"]') as HTMLButtonElement | null;
    let pass = 0;
    let walls = growAll(SEED, Math.floor(CELL_N / 2), 'random');
    let dist = new Int32Array(CELL_N).fill(-1);
    let layer: number[] = [];
    let front = 0;
    let reached = 0;
    let src = ENTRY;
    let farCell = ENTRY;
    let sweep = 1;
    let longest = -1;
    let longEnd = -1;
    let stepAcc = 0;
    let holdLeft = 0;
    function startFlood(s: number, sw: number): void {
        src = s;
        sweep = sw;
        dist = new Int32Array(CELL_N).fill(-1);
        dist[s] = 0;
        layer = [s];
        front = 0;
        reached = 1;
        farCell = s;
        stepAcc = 0;
        holdLeft = 0;
    }
    // 한 겹 번지기 — 지금 겹의 칸마다 열린 이웃 중 아직 거리가 없는 칸에 거리+1 을 적어 다음 겹을 만든다
    function floodStep(): void {
        if (layer.length === 0) { return; }
        const next: number[] = [];
        for (const c of layer) {
            for (let d = 0; d < 4; d += 1) {
                if (!isOpen(walls, c, d)) { continue; }
                const n = neighbor(c, d);
                if (dist[n] >= 0) { continue; }
                dist[n] = front + 1;
                next.push(n);
            }
        }
        if (next.length === 0) {
            layer = [];
            if (sweep === 2) { longest = front; longEnd = farCell; }
            return;
        }
        front += 1;
        layer = next;
        reached += next.length;
        farCell = next[next.length - 1];
    }
    function flooding(): boolean { return layer.length > 0; }
    function report(): void {
        if (flooding()) { say(sweep === 2 ? TXT_FLOOD2 : TXT_FLOOD); }
        else { say(sweep === 2 ? TXT_DONE2 : TXT_DONE1); }
    }
    function flood(n: number): void {
        for (let k = 0; k < n && flooding(); k += 1) { floodStep(); }
    }
    function step(): void {
        if (!flooding()) { return; }
        stepAcc += FIXED_DT;
        while (stepAcc >= FLOOD_STEP_MS && flooding()) {
            stepAcc -= FLOOD_STEP_MS;
            floodStep();
        }
        report();
    }
    function settle(): void {
        flood(CELL_N);
        report();
    }
    // 시연 — 입구에서 번진 뒤 가장 먼 방에서 한 번 더 번진다 (가지 없는 길이 하나뿐인 미로에서 두 번째 끝이 가장 긴 길의 양 끝)
    function demoTick(t: number): void {
        if (flooding() || t < 0) { return; }
        holdLeft += FIXED_DT;
        if (sweep === 1 && holdLeft >= GAP_MS) { startFlood(farCell, 2); }
        else if (sweep === 2 && holdLeft >= HOLD_MS) { newMaze(); }
    }
    function heat(t: number): RGB {
        const x = clamp(t, 0, 1) * (HEAT_RAMP.length - 1);
        const i = Math.min(Math.floor(x), HEAT_RAMP.length - 2);
        return mix(HEAT_RAMP[i], HEAT_RAMP[i + 1], x - i);
    }
    function ringAt(c: number, col: RGB, r: number): void {
        ctx.strokeStyle = rgba(col, 1);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cellX(c) + CS / 2, cellY(c) + CS / 2, r, 0, Math.PI * 2);
        ctx.stroke();
    }
    const UNREACHED = mix(ROCK, PAPER, 0.12);
    function draw(): void {
        clearStage();
        const scale = Math.max(front, HEAT_MAX_D);
        for (let i = 0; i < CELL_N; i += 1) {
            const d = dist[i];
            if (d < 0) { fillCell(i, UNREACHED, 1); continue; }
            fillCell(i, mix(heat(d / scale), PAPER, 0.18), 1);
            if (flooding() && d === front) { fillCell(i, PAPER, RING_ALPHA); }
        }
        strokeWalls(walls, rgba(INK, 1), 2);
        ringAt(src, PAPER, 5);
        ringAt(farCell, PAPER, 6.5);
        drawGates();
        panelRow(0, '거리 겹', String(front));
        panelRow(1, '닿은 칸', String(reached) + ' / ' + String(CELL_N));
        panelRow(2, '가장 먼 방까지', String(dist[farCell]));
        panelRow(3, '가장 긴 길', longest >= 0 ? String(longest) : '—');
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function newMaze(): void {
        pass += 1;
        walls = growAll(SEED + pass, Math.floor(CELL_N / 2), 'random');
        longest = -1;
        longEnd = -1;
        startFlood(ENTRY, 1);
        after();
    }
    function fromFar(): void {
        if (flooding()) { settle(); }
        startFlood(farCell, 2);
        after();
    }
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        const c = cellAt(p[0], p[1]);
        if (c < 0) { return; }
        longest = -1;
        startFlood(c, 1);
        after();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === 'Enter') { ev.preventDefault(); wake(); fromFar(); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); flood(5); after(); }
        else if (ev.key === 'Home') { ev.preventDefault(); wake(); newMaze(); }
    });
    if (farBtn) { farBtn.addEventListener('click', function (): void { wake(); fromFar(); }); }
    if (newBtn) { newBtn.addEventListener('click', function (): void { wake(); newMaze(); }); }
    startFlood(ENTRY, 1);
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
    <div className={cx("hs") + " is-demo"} ref={rootRef}>
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="입구에서 한 겹씩 번지는 파도가 칸마다 거리를 적어 열지도로 물들이고 가장 먼 방을 표시하는 미로. 칸을 누르면 그 칸에서 번진다"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">입구에서 한 겹씩 번지는 중</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="far" type="button">가장 먼 방에서</button>
          <button className={cx("hs__btn")} data-role="new" type="button">새 미로</button>
        </div>
    </div>
  );
}
