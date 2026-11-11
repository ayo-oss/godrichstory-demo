// MzWallShuffleMergeIslands - vanilla 판(03-mz-wall-shuffle-merge-islands) 의 React 포트. 같은 계산을 useEffect 안에서 돌린다.
import { useEffect, useRef } from "react";
import styles from "./MzWallShuffleMergeIslands.module.scss";

const cx = (s: string): string => s.split(" ").map((n) => styles[n] ?? n).join(" ");

export default function MzWallShuffleMergeIslands() {
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
    // 벽 목록을 섞는 시드 — 같은 시드면 같은 순서로 검사해 같은 미로가 나온다
    const WALL_SHUFFLE_SEED = 464;
    // 섬 색은 대표 원소 번호를 이 수로 나눈 나머지로 고른다
    const ISLAND_HUE_N = 6;
    const MERGE_FLASH_MS = 360;
    const CHECK_MS = 5;
    const HOLD_MS = 1400;
    const HUES: RGB[] = [SKY, PINK, MINT, LILAC, PEACH, [250, 232, 160]];
    const TXT_CHECK = '섞은 벽을 앞에서부터 검사하는 중';
    const TXT_DONE = '완성 — 섬이 하나로 합쳐짐';
    const TXT_PAUSE = '멈춤';
    const shuffleBtn = root.querySelector('[data-role="shuffle"]') as HTMLButtonElement | null;
    const pauseBtn = root.querySelector('[data-role="pause"]') as HTMLButtonElement | null;
    // 안쪽 벽 후보 — 칸 번호×2 + (0 동쪽 벽 · 1 남쪽 벽). 31×31 이면 2×31×30 = 1860장
    const wallList: number[] = [];
    for (let i = 0; i < CELL_N; i += 1) {
        if (i % GRID_N < GRID_N - 1) { wallList.push(i * 2); }
        if (Math.floor(i / GRID_N) < GRID_N - 1) { wallList.push(i * 2 + 1); }
    }
    const walls = new Uint8Array(CELL_N);
    const parent = new Int32Array(CELL_N);
    const size = new Int32Array(CELL_N);
    type Flash = { cell: number; dir: number; age: number };
    let flashes: Flash[] = [];
    let order: number[] = [];
    let wi = 0;
    let islands = CELL_N;
    let removed = 0;
    let skipped = 0;
    let pass = 0;
    let paused = false;
    let stepAcc = 0;
    let holdLeft = 0;
    let hiRoot = -1;
    let hiLeft = 0;
    // 피셔–예이츠 섞기 — 뒤에서부터 한 장씩 앞쪽 아무 자리와 바꾼다
    function shuffled(seed: number): number[] {
        const a = wallList.slice();
        const rnd = makeRng(seed);
        for (let k = a.length - 1; k > 0; k -= 1) {
            const j = Math.floor(rnd() * (k + 1));
            const t = a[k];
            a[k] = a[j];
            a[j] = t;
        }
        return a;
    }
    // 대표 원소 찾기 + 경로 압축 — 올라간 길의 칸들을 모두 대표에 바로 붙여 다음 찾기를 짧게 한다
    function find(i: number): number {
        let r = i;
        while (parent[r] !== r) { r = parent[r]; }
        let c = i;
        while (parent[c] !== r) {
            const nx = parent[c];
            parent[c] = r;
            c = nx;
        }
        return r;
    }
    function reset(seed: number): void {
        walls.fill(ALL_WALLS);
        for (let i = 0; i < CELL_N; i += 1) { parent[i] = i; size[i] = 1; }
        order = shuffled(seed);
        wi = 0;
        islands = CELL_N;
        removed = 0;
        skipped = 0;
        flashes = [];
        stepAcc = 0;
        holdLeft = 0;
    }
    // 벽 한 장 검사 — 양쪽 칸의 대표가 다르면 벽을 걷고 작은 섬을 큰 섬 대표 밑에 붙인다(0), 같으면 남긴다(1). 끝나면 2
    function checkStep(): number {
        if (wi >= order.length) { return 2; }
        const code = order[wi];
        wi += 1;
        const a = code >> 1;
        const dir = (code & 1) === 0 ? 1 : 2;
        const b = neighbor(a, dir);
        let ra = find(a);
        let rb = find(b);
        if (ra === rb) { skipped += 1; return 1; }
        knock(walls, a, dir);
        if (size[ra] < size[rb]) { const t = ra; ra = rb; rb = t; }
        parent[rb] = ra;
        size[ra] += size[rb];
        islands -= 1;
        removed += 1;
        flashes.push({ cell: a, dir: dir, age: 0 });
        return 0;
    }
    function done(): boolean { return wi >= order.length; }
    function report(): void {
        if (done()) { say(TXT_DONE); }
        else if (paused) { say(TXT_PAUSE); }
        else { say(TXT_CHECK); }
    }
    function run(n: number): void {
        for (let k = 0; k < n && !done(); k += 1) { checkStep(); }
    }
    function step(): void {
        for (const f of flashes) { f.age += FIXED_DT; }
        flashes = flashes.filter(function (f: Flash): boolean { return f.age < MERGE_FLASH_MS; });
        if (hiLeft > 0) { hiLeft -= FIXED_DT; if (hiLeft <= 0) { hiRoot = -1; } }
        if (paused || done()) { return; }
        stepAcc += FIXED_DT;
        while (stepAcc >= CHECK_MS && !done()) {
            stepAcc -= CHECK_MS;
            checkStep();
        }
        report();
    }
    function settle(): void {
        run(order.length);
        flashes = [];
        report();
    }
    function demoTick(t: number): void {
        if (!done() || t < 0) { return; }
        holdLeft += FIXED_DT;
        if (holdLeft >= HOLD_MS) {
            pass += 1;
            reset(WALL_SHUFFLE_SEED + pass);
        }
    }
    function islandColor(r: number): RGB { return HUES[r % ISLAND_HUE_N]; }
    function draw(): void {
        clearStage();
        const hr = hiRoot >= 0 ? find(hiRoot) : -1;
        for (let i = 0; i < CELL_N; i += 1) {
            const r = find(i);
            let c = mix(islandColor(r), PAPER, 0.28);
            if (hr >= 0) { c = r === hr ? mix(c, PAPER, 0.35) : mix(c, BG, 0.55); }
            fillCell(i, c, 1);
        }
        for (const f of flashes) {
            const k = 1 - f.age / MERGE_FLASH_MS;
            const x = cellX(f.cell) + CS / 2;
            const y = cellY(f.cell) + CS / 2;
            const mx = x + DX[f.dir] * CS / 2;
            const my = y + DY[f.dir] * CS / 2;
            ctx.fillStyle = rgba(PAPER, 0.9 * k);
            ctx.beginPath();
            ctx.arc(mx, my, 2 + 7 * (1 - k), 0, Math.PI * 2);
            ctx.fill();
        }
        strokeWalls(walls, rgba(INK, 1), 2);
        drawGates();
        panelRow(0, '섬', String(islands));
        panelRow(1, '검사한 벽', String(wi) + ' / ' + String(order.length));
        panelRow(2, '걷은 벽', String(removed));
        panelRow(3, '남긴 벽', String(skipped));
    }
    function after(): void {
        if (still) { settle(); }
        report();
        draw();
    }
    function reshuffle(): void {
        pass += 1;
        reset(WALL_SHUFFLE_SEED + pass);
        after();
    }
    function setPaused(v: boolean): void {
        paused = v;
        if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', v ? 'true' : 'false'); }
        report();
        draw();
    }
    // 칸을 누르면 그 칸이 속한 섬 전체를 밝힌다 — 대표가 같은 칸이 모두 한 섬이다
    cv.addEventListener('pointerdown', function (ev: PointerEvent): void {
        wake();
        const p = toScene(ev);
        const c = cellAt(p[0], p[1]);
        if (c < 0) { return; }
        hiRoot = c;
        hiLeft = 1400;
        draw();
    });
    cv.addEventListener('keydown', function (ev: KeyboardEvent): void {
        if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); wake(); setPaused(!paused); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); wake(); run(60); after(); }
        else if (ev.key === 'Home' || ev.key === 'Enter') { ev.preventDefault(); wake(); reshuffle(); }
    });
    if (shuffleBtn) { shuffleBtn.addEventListener('click', function (): void { wake(); reshuffle(); }); }
    if (pauseBtn) { pauseBtn.addEventListener('click', function (): void { wake(); setPaused(!paused); }); }
    reset(WALL_SHUFFLE_SEED);
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
        <canvas className={cx("hs__canvas")} data-role="canvas" width={480} height={300} tabIndex={0} aria-label="섞어 놓은 벽 목록을 앞에서부터 검사해 다른 섬 사이 벽만 걷고 섬을 합치는 미로. 칸을 누르면 그 칸의 섬을 밝힌다"></canvas>
        <p className={cx("hs__status")} data-role="status" aria-live="off">섞은 벽을 앞에서부터 검사하는 중</p>
        <div className={cx("hs__tools")}>
          <button className={cx("hs__btn")} data-role="shuffle" type="button">다시 섞기</button>
          <button className={cx("hs__btn")} data-role="pause" type="button" aria-pressed="false">멈춤</button>
        </div>
    </div>
  );
}
