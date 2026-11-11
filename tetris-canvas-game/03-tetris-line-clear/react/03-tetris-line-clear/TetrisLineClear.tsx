// TetrisLineClear — vanilla 판(run/330/demo/03-tetris-line-clear/index.html) 의 React 포트.
// 매 프레임 (1) 조각을 내리고 (2) 잠근 뒤 줄마다 빈 칸 수를 세어 0개인 줄만 골라
// (3) 0.18초 섬광 뒤 splice 로 자르고 (4) 위 칸 전체를 한 칸씩 떨어뜨린다(0.12초).
// 붕괴는 그 자체가 계산이다 — 배열이 한 칸씩 밀리며 화면 절반이 바뀐다.
// SHAPES 원본은 오염시키지 않는다 — 낙하 판은 slice 사본. 값·수치는 vanilla 와 같다.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 클리어 직전 상태의 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisLineClear.module.scss";

export type TetrisLineClearProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 10, ROWS = 16;
const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
const SHAPES: Record<string, number[][]> = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]],
  O: [[1, 1], [2, 1], [1, 2], [2, 2]],
  T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const FLASH_S = 0.18, DROP_S = 0.12; // 섬광 시간 · 붕괴 시간 (초)

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const FLASH = "#ffd23f";
const BAR = "#17141a";

const HINT = "빈 칸 0개인 줄만 지운다";
const ARIA_FIELD = "라인 클리어";
const ARIA_BARS = "줄마다 찬 칸 수";
const UNIT = "줄 지움";

// 시드 고정 난수 — 같은 판이 반복된다
function mulberry32(a: number): () => number {
  return function (): number {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rotCW(cells: number[][], n: number): number[][] {
  return cells.map((c) => [c[1], n - 1 - c[0]]);
}
function hits(grid: string[][], cells: number[][], row: number, col: number): boolean {
  for (let i = 0; i < cells.length; i++) {
    const x = col + cells[i][0], y = row + cells[i][1];
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && grid[y][x]) return true;
  }
  return false;
}

type Grid = string[][];
type Piece = { t: string; cells: number[][]; x: number; y: number; drop: number };

export default function TetrisLineClear({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: TetrisLineClearProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const barsRef = useRef<HTMLDivElement | null>(null);
  const bcvRef = useRef<HTMLCanvasElement | null>(null);
  const countRef = useRef<HTMLBRElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctx2Ref = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, BW: 0, BH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    flashRows: [] as number[], flashT: 0, dropY: 0, cleared: 0, waitT: 0
  }) as Box<{
    W: number; H: number; BW: number; BH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    flashRows: number[]; flashT: number; dropY: number; cleared: number; waitT: number;
  }>;
  const rndRef = useRef(mulberry32(3303)) as Box<() => number>;
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
  // 시작 쓰레기 — 아래 6줄, 줄마다 구멍 1칸. 클리어가 곧바로 일어나는 높이
  function garbage(): void {
    const st = stRef.current;
    for (let gy = ROWS - 6; gy < ROWS; gy++) {
      const h1 = Math.floor(rndRef.current() * COLS);
      for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === h1 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
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
  function spawn(): void {
    const st = stRef.current;
    const t = nextType();
    st.piece = { t: t, cells: SHAPES[t].slice(), x: 2 + Math.floor(rndRef.current() * (COLS - 4)), y: -0.6, drop: 16 };
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
      // 줄 검사 — 빈 칸 0개인 줄만
      st.flashRows = [];
      for (let y = 0; y < ROWS; y++) {
        let n = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
        if (n === COLS) st.flashRows.push(y);
      }
      if (st.flashRows.length) { st.flashT = FLASH_S; }
    }
    st.piece = null;
  }
  function spliceRows(): void {
    const st = stRef.current;
    st.flashRows.sort((a, b) => a - b);
    st.cleared += st.flashRows.length;
    const out = countRef.current;
    if (out) out.textContent = String(st.cleared);
    for (let i = 0; i < st.flashRows.length; i++) {
      st.grid.splice(st.flashRows[i], 1);
      st.grid.unshift(new Array(COLS).fill(""));
    }
    // 쓰레기 보충 — 판이 비면 다시 아래쪽에 구멍진 줄을 넣어 클리어가 계속 일어나게
    let filled = 0;
    for (let y2 = 0; y2 < ROWS; y2++) for (let x2 = 0; x2 < COLS; x2++) if (st.grid[y2][x2]) filled += 1;
    if (filled < COLS * 3) garbage();
    st.flashRows = [];
    st.dropY = 1; // 붕괴 시각 — 위 칸이 한 칸 내려오는 동안
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current, bars = barsRef.current, bcv = bcvRef.current;
    if (!field || !cv || !bars || !bcv) return;
    const ctx = cv.getContext("2d"), ctx2 = bcv.getContext("2d");
    if (!ctx || !ctx2) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.BW = bars.clientWidth; st.BH = bars.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    bcv.width = Math.round(st.BW * st.dpr); bcv.height = Math.round(st.BH * st.dpr);
    ctx2.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    ctx2Ref.current = ctx2;
  }

  function paintCell(px: number, py: number, t: string, alpha?: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = Math.max(2, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, st.cell - 2, st.cell - 2, r);
    ctx.fillStyle = FILL[t]; ctx.fill();
    ctx.lineWidth = Math.max(1, st.cell * 0.14);
    ctx.strokeStyle = EDGE[t]; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw(fallOff: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + ROWS * st.cell); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + COLS * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();
    // 쌓인 칸 — 붕괴 진행 중이면 잘린 줄 위쪽을 fallOff 칸만큼 내려 그린다
    for (let gy = 0; gy < ROWS; gy++) {
      const isFlash = st.flashRows.indexOf(gy) >= 0;
      let fy = gy;
      if (st.dropY > 0 && !isFlash) {
        // 잘린 줄 개수만큼 위 칸이 내려온다 — 간단히 전체를 fallOff 만큼
        fy = gy + fallOff;
      }
      for (let gx = 0; gx < COLS; gx++) {
        if (!st.grid[gy][gx]) continue;
        const py = st.oy + fy * st.cell;
        if (py < st.oy - st.cell) continue;
        paintCell(st.ox + gx * st.cell, Math.min(py, st.oy + (ROWS - 1) * st.cell), st.grid[gy][gx]);
      }
    }
    // 섬광 — 찢어지며 밝아진다
    if (st.flashT > 0) {
      ctx.globalAlpha = Math.min(1, st.flashT / FLASH_S) * 0.9;
      for (let f = 0; f < st.flashRows.length; f++) {
        ctx.fillStyle = FLASH;
        ctx.fillRect(st.ox, st.oy + st.flashRows[f] * st.cell, st.cell * COLS, st.cell);
      }
      ctx.globalAlpha = 1;
    }
    // 낙하 조각
    if (st.piece) {
      for (let i = 0; i < st.piece.cells.length; i++) {
        const cy = st.piece.y + st.piece.cells[i][1];
        if (cy >= 0) paintCell(st.ox + Math.round(st.piece.x + st.piece.cells[i][0]) * st.cell, st.oy + Math.round(cy) * st.cell, st.piece.t);
      }
    }
  }
  function drawBars(): void {
    const st = stRef.current;
    const ctx2 = ctx2Ref.current;
    if (!ctx2 || !st.BW || !st.BH) return;
    ctx2.clearRect(0, 0, st.BW, st.BH);
    const rh = st.BH / ROWS;
    for (let y = 0; y < ROWS; y++) {
      let n = 0;
      for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
      if (!n) continue;
      ctx2.fillStyle = BAR;
      ctx2.globalAlpha = n === COLS ? 1 : 0.35 + 0.5 * (n / COLS);
      const bw2 = (n / COLS) * st.BW;
      ctx2.fillRect(0, y * rh + 1, bw2, rh - 2);
    }
    ctx2.globalAlpha = 1;
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (st.flashT > 0) {
      st.flashT -= dt;
      if (st.flashT <= 0) spliceRows();
    } else if (st.dropY > 0) {
      st.dropY = Math.max(0, st.dropY - dt / DROP_S);
      if (st.dropY === 0) st.waitT = 0.05;
    } else if (st.piece) {
      st.piece.y += st.piece.drop * dt;
      const rx = Math.round(st.piece.x), ry = Math.floor(st.piece.y) + 1;
      if (hits(st.grid, st.piece.cells, ry, rx)) {
        st.piece.y = ry - 1;
        lock();
      }
    } else {
      st.waitT -= dt;
      if (st.waitT <= 0) spawn();
    }
    draw(st.dropY > 0 ? st.dropY : 0);
    drawBars();
    rafRef.current = requestAnimationFrame(step);
  }

  // 누르면 즉시 착지 — 클리어 검사까지 한 번에
  function onPointerDown(): void {
    const st = stRef.current;
    if (st.piece) {
      while (!hits(st.grid, st.piece.cells, Math.floor(st.piece.y) + 1, Math.round(st.piece.x))) st.piece.y += 1;
      lock();
      if (reduced()) { draw(0); drawBars(); }
    }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    garbage();
    refill();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(0); drawBars(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 클리어 직전 상태(한 줄만 구멍 1칸)를 보인다
      for (let x3 = 0; x3 < COLS; x3++) st.grid[ROWS - 3][x3] = TYPES[(x3 + 3) % 7];
      st.grid[ROWS - 3][2] = "";
      draw(0); drawBars();
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

  const rootCls = still ? styles.lc + " " + styles.isStill : styles.lc;
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
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.bars} ref={barsRef} role="img" aria-label={ARIA_BARS}>
              <canvas ref={bcvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
