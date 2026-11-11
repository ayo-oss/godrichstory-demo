// TetrisBoardGrid — vanilla 판(run/330/demo/01-tetris-board-grid/index.html) 의 React 포트.
// grid[20][10] 2차원 배열이 보드의 전 상태다. 매 프레임 (1) 낙하 조각을 중력 delta 만큼
// 내리고 (2) 모든 셀 좌표를 충돌 검사하고 (3) fillRect 로 칸을 그린다. 조각 배치는 1수 탐색 —
// 회전 4 × 열 10 조합의 착지 결과를 격자에 놓아보고 (완성 줄 − 구멍 − 높이) 로 점수를 매겨
// 최적을 고른다. 시드 고정(mulberry32)이라 같은 판이 반복된다. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 스캔 지점과 쌓인 칸이 다 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisBoardGrid.module.scss";

export type TetrisBoardGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 10, ROWS = 20, CELLS = COLS * ROWS;
const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
// SHAPES 는 원본을 오염시키지 않는다 — 회전·낙하 판은 map/slice 로 사본을 만든다
const SHAPES: Record<string, number[][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 1], [2, 1], [1, 2], [2, 2]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const BOX: Record<string, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
const KICKS = [0, -1, 1, -2, 2];
const HOLD_S = 1.4; // 착지 후 계획과 어긋난 채 쉴 수 있는 최대 시간(초)

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(255,247,230,.08)";
const FLASH = "#ffd23f";
const BAR = "#6ec8ff";

const HINT = "10 × 20 칸 · 매 프레임 충돌 검사";
const ARIA_FIELD = "보드 격자 실험판";
const ARIA_PROF = "열 높이 그래프";
const CELLS_UNIT = "칸을 그렸습니다";
const ARRAY_WORD = "배열";
const SCAN_UNIT = "번째 칸";

// 시드 고정 난수 — 같은 판이 반복된다
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 회전 — (x,y) → (y,−x). 행렬 곱 90도와 같은 식이고, y 에 n−1 을 더해 n×n 상자 안으로 되돌린다
function rotCW(cells: number[][], n: number): number[][] {
  return cells.map((c) => [c[1], n - 1 - c[0]]);
}
function shapeRot(t: string, r: number): number[][] {
  let c = SHAPES[t];
  for (let i = 0; i < r; i++) c = rotCW(c, BOX[t]);
  return c;
}

type Grid = string[][];
type Piece = { t: string; r: number; cells: number[][]; x: number; y: number; plan: { r: number; c: number }; drop: number; slide: number };

export default function TetrisBoardGrid({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: TetrisBoardGridProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const profRef = useRef<HTMLDivElement | null>(null);
  const pcvRef = useRef<HTMLCanvasElement | null>(null);
  const countRef = useRef<HTMLBRElement | null>(null);
  const scanRef = useRef<HTMLBRElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctx2Ref = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, PW: 0, PH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    flashRows: [] as number[], flashT: 0, restT: 0,
    colSeen: new Array<number>(COLS).fill(-9)
  }) as Box<{
    W: number; H: number; PW: number; PH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    flashRows: number[]; flashT: number; restT: number; colSeen: number[];
  }>;
  const rndRef = useRef(mulberry32(3301)) as Box<() => number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function emptyGrid(): Grid {
    const g: Grid = [];
    for (let y = 0; y < ROWS; y++) { g.push([]); for (let x = 0; x < COLS; x++) g[y].push(""); }
    return g;
  }
  function cloneGrid(g: Grid): Grid {
    return g.map((row) => row.slice());
  }
  // 충돌 검사 — 조각 셀 전부를 격자·벽과 견준다. 이 하나가 벽 뚫림을 막는다
  function hits(grid: Grid, cells: number[][], row: number, col: number): boolean {
    for (let i = 0; i < cells.length; i++) {
      const x = col + cells[i][0], y = row + cells[i][1];
      if (x < 0 || x >= COLS || y >= ROWS) return true;
      if (y >= 0 && grid[y][x]) return true;
    }
    return false;
  }
  function landingRow(grid: Grid, cells: number[][], col: number): number {
    let row = -4;
    while (!hits(grid, cells, row + 1, col)) row += 1;
    return row;
  }
  // 1수 탐색 — 착지 결과의 구멍·총 높이·완성 줄로 점수. 깊게 놓을수록 좋다
  function choose(grid: Grid, t: string): { r: number; c: number } | null {
    let best: { r: number; c: number; score: number } | null = null;
    for (let r = 0; r < 4; r++) {
      const cells = shapeRot(t, r);
      for (let c = -2; c < COLS; c++) {
        if (hits(grid, cells, 0, c)) continue;
        const row = landingRow(grid, cells, c);
        if (row < 0) continue;
        const g2 = cloneGrid(grid);
        for (let i = 0; i < cells.length; i++) g2[row + cells[i][1]][c + cells[i][0]] = t;
        let full = 0, holes = 0, agg = 0;
        for (let y = 0; y < ROWS; y++) {
          let filled = 0;
          for (let x = 0; x < COLS; x++) if (g2[y][x]) filled += 1;
          if (filled === COLS) full += 1;
        }
        for (let x2 = 0; x2 < COLS; x2++) {
          let seen = false;
          for (let y2 = 0; y2 < ROWS; y2++) {
            if (g2[y2][x2]) { seen = true; agg += ROWS - y2; }
            else if (seen) holes += 1;
          }
        }
        const score = full * 120 - holes * 90 - agg * 2 + row;
        if (!best || score > best.score) best = { r: r, c: c, score: score };
      }
    }
    return best;
  }

  function refill(): void {
    const st = stRef.current;
    st.bag = TYPES.slice();
    for (let i = st.bag.length - 1; i > 0; i--) {
      const j = Math.floor(rndRef.current() * (i + 1));
      const tmp = st.bag[i]; st.bag[i] = st.bag[j]; st.bag[j] = tmp;
    }
  }
  function nextType(): string {
    const st = stRef.current;
    if (!st.bag.length) refill();
    return st.bag.pop() as string;
  }
  function filledCount(): number {
    const st = stRef.current;
    let n = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
    return n;
  }
  function spawn(): void {
    const st = stRef.current;
    const t = nextType();
    let plan = choose(st.grid, t);
    if (!plan) { st.grid = emptyGrid(); plan = choose(st.grid, t) as { r: number; c: number }; }
    st.piece = { t: t, r: 0, cells: SHAPES[t].slice(), x: 3, y: -2.2, plan: plan, drop: 4.6, slide: 9.5 };
    st.restT = 0;
  }
  function lock(): void {
    const st = stRef.current;
    const p = st.piece;
    if (!p) return;
    const rx = Math.round(p.x), ry = Math.floor(p.y);
    let dead = false;
    for (let i = 0; i < p.cells.length; i++) {
      const gx = rx + p.cells[i][0], gy = ry + p.cells[i][1];
      if (gy < 0) { dead = true; break; }
      st.grid[gy][gx] = p.t;
    }
    if (dead) { st.grid = emptyGrid(); }
    else {
      const full: number[] = [];
      for (let y = 0; y < ROWS; y++) {
        let n = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
        if (n === COLS) full.push(y);
      }
      if (full.length) { st.flashRows = full; st.flashT = 0.30; }
    }
    const out = countRef.current;
    if (out) out.textContent = String(filledCount());
    spawn();
  }
  function spliceFull(): void {
    const st = stRef.current;
    st.flashRows.sort((a, b) => a - b);
    for (let i = 0; i < st.flashRows.length; i++) {
      st.grid.splice(st.flashRows[i], 1);
      st.grid.unshift(new Array(COLS).fill(""));
    }
    st.flashRows = [];
    const out = countRef.current;
    if (out) out.textContent = String(filledCount());
  }
  function tryRotate(): boolean {
    const st = stRef.current;
    const p = st.piece;
    if (!p) return false;
    const rc = rotCW(p.cells, BOX[p.t]);
    const px = Math.round(p.x), py = Math.floor(p.y);
    for (let k = 0; k < KICKS.length; k++) {
      if (!hits(st.grid, rc, py, px + KICKS[k])) {
        p.cells = rc; p.x = px + KICKS[k]; p.r = (p.r + 1) % 4;
        return true;
      }
    }
    return false;
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current, prof = profRef.current, pcv = pcvRef.current;
    if (!field || !cv || !prof || !pcv) return;
    const ctx = cv.getContext("2d"), ctx2 = pcv.getContext("2d");
    if (!ctx || !ctx2) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.PW = prof.clientWidth; st.PH = prof.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    pcv.width = Math.round(st.PW * st.dpr); pcv.height = Math.round(st.PH * st.dpr);
    ctx2.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    ctx2Ref.current = ctx2;
  }

  function paintCell(gx: number, gy: number, t: string, alpha?: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const px = st.ox + gx * st.cell, py = st.oy + gy * st.cell;
    const r = Math.max(2, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, st.cell - 2, st.cell - 2, r);
    ctx.fillStyle = FILL[t]; ctx.fill();
    ctx.lineWidth = Math.max(1, st.cell * 0.14);
    ctx.strokeStyle = EDGE[t]; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw(time: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, st.W, st.H);
    // 격자 — 배열의 칸 수 그대로
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + ROWS * st.cell); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + COLS * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();
    // 쌓인 칸
    for (let gy = 0; gy < ROWS; gy++) for (let gx = 0; gx < COLS; gx++) if (st.grid[gy][gx]) paintCell(gx, gy, st.grid[gy][gx]);
    // 클리어 섬광 — splice 전 0.3초
    if (st.flashT > 0) {
      ctx.globalAlpha = Math.min(1, st.flashT / 0.30) * 0.85;
      for (let f = 0; f < st.flashRows.length; f++) {
        ctx.fillStyle = FLASH;
        ctx.fillRect(st.ox, st.oy + st.flashRows[f] * st.cell, st.cell * COLS, st.cell);
      }
      ctx.globalAlpha = 1;
    }
    // 낙하 조각 (y<0 위쪽은 자른다)
    if (st.piece) {
      const fx = st.piece.x, fy = st.piece.y;
      for (let i = 0; i < st.piece.cells.length; i++) {
        const cx2 = st.piece.cells[i][0], cy2 = st.piece.cells[i][1];
        if (fy + cy2 >= 0) paintCell(Math.round(fx + cx2), Math.round(fy + cy2), st.piece.t);
      }
    }
    // 배열 스캔 — 200칸을 초당 120칸씩 훑는다(1.7초에 보드 한 바퀴). 검사가 지나간
    // 열은 0.5초에 걸쳐 서서히 사그라는 잔상을 남긴다 — "살펴본 자리"가 눈에 쌓인다
    const idx = Math.floor(time * 0.12) % CELLS;
    const sx = idx % COLS, sy = Math.floor(idx / COLS);
    st.colSeen[sx] = time;
    ctx.fillStyle = FLASH;
    for (let c2 = 0; c2 < COLS; c2++) {
      let age = (time - st.colSeen[c2]) / 1000;
      if (age < 0) age += 1e9; // 스캔을 아직 안 지나간 열
      if (age > 0.6) continue;
      const a = age < 0 ? 0 : 0.42 * (1 - age / 0.6);
      if (a <= 0.02) continue;
      ctx.globalAlpha = a;
      ctx.fillRect(st.ox + c2 * st.cell, st.oy, st.cell, ROWS * st.cell);
    }
    ctx.globalAlpha = 1;
    const sp0 = st.ox + sx * st.cell, sp1 = st.oy + sy * st.cell;
    ctx.strokeStyle = FLASH; ctx.lineWidth = 2;
    ctx.strokeRect(sp0 + 0.5, sp1 + 0.5, st.cell - 1, st.cell - 1);
    const out = scanRef.current;
    if (out) out.textContent = String(idx);
  }
  // 열 높이 그래프 — 같은 배열을 다른 각도로 읽는다. 열마다 쌓인 칸 수를 세어
  // 막대로 세운다. 조각이 놓이고 줄이 지워질 때마다 막대 전체가 다시 계산된다
  function drawProfile(time: number): void {
    const st = stRef.current;
    const ctx2 = ctx2Ref.current;
    if (!ctx2 || !st.PW || !st.PH) return;
    ctx2.clearRect(0, 0, st.PW, st.PH);
    const bw = st.PW / COLS;
    for (let x = 0; x < COLS; x++) {
      let h = 0;
      for (let y = 0; y < ROWS; y++) if (st.grid[y][x]) h += 1;
      if (!h) continue;
      const bh = (h / ROWS) * st.PH;
      ctx2.fillStyle = BAR;
      ctx2.globalAlpha = 0.55 + 0.45 * (h / ROWS);
      ctx2.fillRect(x * bw + 1, st.PH - bh, bw - 2, bh);
    }
    ctx2.globalAlpha = 1;
    // 스캔이 지금 머문 열 표시
    const idx2 = Math.floor(time * 0.12) % CELLS;
    ctx2.strokeStyle = FLASH; ctx2.lineWidth = 2;
    ctx2.strokeRect((idx2 % COLS) * bw + 0.5, 0.5, bw - 1, st.PH - 1);
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (st.flashT > 0) { st.flashT -= dt; if (st.flashT <= 0) spliceFull(); }
    if (st.piece) {
      const plan = st.piece.plan;
      const dx = plan.c - st.piece.x;
      st.piece.x += Math.max(-st.piece.slide * dt, Math.min(st.piece.slide * dt, dx));
      if (st.piece.r !== plan.r && Math.abs(plan.c - st.piece.x) < 0.6) tryRotate();
      st.piece.y += st.piece.drop * dt;
      const rx = Math.round(st.piece.x), ry = Math.floor(st.piece.y) + 1;
      if (hits(st.grid, st.piece.cells, ry, rx)) {
        st.piece.y = ry - 1;
        st.restT += dt;
        const aligned = st.piece.r === plan.r && rx === plan.c;
        if (aligned || st.restT > HOLD_S) { st.piece.x = plan.c; lock(); }
      } else st.restT = 0;
    }
    draw(now);
    drawProfile(now);
    rafRef.current = requestAnimationFrame(step);
  }

  // 눌러 보기 — 현재 조각을 착지점까지 한 번에 내린다 (고스트 계산과 같은 식)
  function onPointerDown(): void {
    const st = stRef.current;
    if (st.piece) {
      st.piece.x = st.piece.plan.c;
      while (st.piece.r !== st.piece.plan.r && tryRotate()) { /* 회전을 계획까지 맞춘다 */ }
      st.piece.y = landingRow(st.grid, st.piece.cells, Math.round(st.piece.x));
      lock();
      if (reduced()) { draw(320); drawProfile(320); }
    }
  }

  useEffect(() => {
    const st = stRef.current;
    // 시작 쓰레기 — 아래 네 줄을 시드 난수로 미리 채운다. 줄마다 구멍 한 칸(클리어 직전 상태)
    st.grid = emptyGrid();
    for (let gy = ROWS - 4; gy < ROWS; gy++) {
      const hole = Math.floor(rndRef.current() * COLS);
      for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === hole ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    fit();
    const out = countRef.current;
    if (out) out.textContent = String(filledCount());
    function onResize(): void {
      fit();
      if (reduced()) { draw(320); drawProfile(320); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 스캔 지점과 쌓인 칸이 다 보이는 시각. 조각 여섯을 미리 놓는다
      for (let i = 0; i < 6; i++) { spawn(); lock(); }
      draw(320);
      drawProfile(320);
      setStill(true);
    } else {
      spawn();
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.tg + " " + styles.isStill : styles.tg;
  return (
    <main className={styles.stage}>
      <div className={rootCls} style={vars}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.row}>
          <div
            className={styles.field}
            ref={fieldRef}
            role="application"
            aria-label={ARIA_FIELD}
            tabIndex={0}
            onPointerDown={onPointerDown}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <b className={styles.count} ref={countRef} aria-live="polite">0</b>
            <span className={styles.unit}>{CELLS_UNIT}</span>
            <p className={styles.scan}>{ARRAY_WORD} <b ref={scanRef}>0</b><span className={styles.scanUnit}>{SCAN_UNIT}</span></p>
            <div className={styles.prof} ref={profRef} role="img" aria-label={ARIA_PROF}>
              <canvas ref={pcvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
