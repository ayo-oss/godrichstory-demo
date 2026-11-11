// TetrisNextQueue — vanilla 판(run/330/demo/05-tetris-next-queue/index.html) 의 React 포트.
// 일곱 조각을 한 세트로 섞어 가방에 채우고 앞의 다섯을 미니 캔버스에 그린다.
// 가방이 비면 다시 섞는다 — 편향 없이 다음이 예측만 되고 뻔하지는 않다.
// 조각이 하나 소비될 때 큐가 한 칸씩 올라가고(0.2초 보간), 가방이 다시 섞이는 순간 표시가 바뀐다.
// 정렬 전 낙하 5.5칸/s · 정렬 후 착지 40칸/s clamp · 미끄러짐 13칸/s. 값·수치는 vanilla 와 같다.
// SHAPES 원본은 오염시키지 않는다 — 낙하 판은 slice, 회전 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 큐 다섯 칸이 다 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisNextQueue.module.scss";

export type TetrisNextQueueProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 8, ROWS = 14;
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
const BOX: Record<string, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
const NQ = 5; // 미리 보는 조각 수
const FALL_ALIGNED = 40, DRIFT = 5.5, SLIDE = 13; // 정렬 후 착지 40칸/s · 정렬 전 5.5칸/s · 미끄러짐 13칸/s

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(255,247,230,.08)";

const HINT = "가방 7개 섞기 — 다음이 뻔하지 않게";
const ARIA_FIELD = "다음 미리 보기";
const L_NEXT = "다음";
const BAG_WORD = "가방";
const BAG_STILL = "가방 3 / 7";

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
function landingRow(grid: string[][], cells: number[][], col: number): number {
  let row = -4;
  while (!hits(grid, cells, row + 1, col)) row += 1;
  return row;
}
function shapeRot(t: string, r: number): number[][] {
  let c = SHAPES[t].map((p) => p.slice());
  const n = BOX[t];
  for (let i = 0; i < r; i++) c = rotCW(c, n);
  return c;
}

type Grid = string[][];
type Piece = { t: string; r: number; cells: number[][]; x: number; y: number; plan: { r: number; c: number } };
// 미니 캔버스 슬롯 — 큐 칸마다 하나
type Slot = { el: HTMLCanvasElement | null; ctx: CanvasRenderingContext2D | null; w: number; h: number };

export default function TetrisNextQueue({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: TetrisNextQueueProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const queueRef = useRef<HTMLDivElement | null>(null);
  const bagRef = useRef<HTMLParagraphElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], bagUsed: 0, bagCount: 0,
    queue: [] as string[], piece: null as Piece | null, popped: 0, popT: 0,
    slots: [] as Slot[]
  }) as Box<{
    W: number; H: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; bagUsed: number; bagCount: number;
    queue: string[]; piece: Piece | null; popped: number; popT: number;
    slots: Slot[];
  }>;
  const rndRef = useRef(mulberry32(3305)) as Box<() => number>;
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
          let f = 0;
          for (let x = 0; x < COLS; x++) if (g2[y][x]) f += 1;
          if (f === COLS) full += 1;
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

  // 가방 — 일곱 조각을 한 세트로 섞는다
  function refill(): void {
    const st = stRef.current;
    st.bag = TYPES.slice();
    for (let i = st.bag.length - 1; i > 0; i--) {
      const j = Math.floor(rndRef.current() * (i + 1));
      const tmp = st.bag[i]; st.bag[i] = st.bag[j]; st.bag[j] = tmp;
    }
    st.bagUsed = 0; st.bagCount += 1;
  }
  function nextType(): string {
    const st = stRef.current;
    if (!st.bag.length) refill();
    st.bagUsed += 1;
    return st.bag.pop() as string;
  }
  function fillQueue(): void {
    const st = stRef.current;
    while (st.queue.length < NQ + 2) st.queue.push(nextType());
  }

  function spawn(): void {
    const st = stRef.current;
    const t = st.queue.shift() as string;
    fillQueue();
    let plan = choose(st.grid, t);
    if (!plan) { st.grid = emptyGrid(); plan = choose(st.grid, t) as { r: number; c: number }; }
    st.piece = { t: t, r: 0, cells: SHAPES[t].slice(), x: 3, y: -0.4, plan: plan };
    st.popped += 1;
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
    if (dead) st.grid = emptyGrid();
    else {
      for (let y = 0; y < ROWS; y++) {
        let n = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
        if (n === COLS) { st.grid.splice(y, 1); st.grid.unshift(new Array(COLS).fill("")); }
      }
    }
    // 판이 얇아지면 쓰레기 보충
    let filled = 0;
    for (let y2 = 0; y2 < ROWS; y2++) for (let x2 = 0; x2 < COLS; x2++) if (st.grid[y2][x2]) filled += 1;
    if (filled < COLS * 2) {
      for (let gy = ROWS - 3; gy < ROWS; gy++) {
        const h = Math.floor(rndRef.current() * COLS);
        for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === h ? "" : TYPES[Math.floor(rndRef.current() * 7)];
      }
    }
    st.piece = null;
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    for (let i = 0; i < st.slots.length; i++) {
      const m = st.slots[i].el;
      if (!m) continue;
      const c = m.getContext("2d");
      if (!c) continue;
      const w = m.clientWidth || 44, h = m.clientHeight || 44;
      m.width = Math.round(w * st.dpr); m.height = Math.round(h * st.dpr);
      c.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      st.slots[i].ctx = c;
      st.slots[i].w = w; st.slots[i].h = h;
    }
  }

  function paintCell(gx: number, gy: number, t: string, alpha?: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = Math.max(2, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(st.ox + gx * st.cell + 1, st.oy + gy * st.cell + 1, st.cell - 2, st.cell - 2, r);
    ctx.fillStyle = FILL[t]; ctx.fill();
    ctx.lineWidth = Math.max(1, st.cell * 0.14);
    ctx.strokeStyle = EDGE[t]; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawMini(slot: Slot, t: string | undefined, alpha: number): void {
    const c = slot.ctx;
    const w = slot.w, h = slot.h;
    if (!c) return;
    c.clearRect(0, 0, w, h);
    if (!t) return;
    const cells = SHAPES[t];
    // 조각을 슬롯 중앙에 맞춘다
    let minX = 9, maxX = -9, minY = 9, maxY = -9;
    for (let i = 0; i < cells.length; i++) {
      minX = Math.min(minX, cells[i][0]); maxX = Math.max(maxX, cells[i][0]);
      minY = Math.min(minY, cells[i][1]); maxY = Math.max(maxY, cells[i][1]);
    }
    const pw = maxX - minX + 1, ph = maxY - minY + 1;
    const mc = Math.min(w / 4.4, h / 4.4);
    const mx = (w - pw * mc) / 2, my = (h - ph * mc) / 2;
    for (let k = 0; k < cells.length; k++) {
      // 칸 밑면 — fillRect 로 깔고 그 위에 테두리 사각을 얹는다 (메인 보드와 같은 순서)
      c.fillStyle = EDGE[t];
      c.globalAlpha = alpha * 0.25;
      c.fillRect(mx + (cells[k][0] - minX) * mc, my + (cells[k][1] - minY) * mc, mc, mc);
      c.globalAlpha = alpha;
      c.beginPath();
      c.roundRect(mx + (cells[k][0] - minX) * mc + 1, my + (cells[k][1] - minY) * mc + 1, mc - 2, mc - 2, Math.max(2, mc * 0.22));
      c.fillStyle = FILL[t]; c.fill();
      c.lineWidth = Math.max(1.5, mc * 0.13);
      c.strokeStyle = EDGE[t]; c.stroke();
    }
    c.globalAlpha = 1;
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = LINE; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + ROWS * st.cell); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + COLS * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();
    for (let gy = 0; gy < ROWS; gy++) for (let gx = 0; gx < COLS; gx++) if (st.grid[gy][gx]) paintCell(gx, gy, st.grid[gy][gx]);
    if (st.piece) {
      for (let i = 0; i < st.piece.cells.length; i++) {
        const cy = st.piece.y + st.piece.cells[i][1];
        if (cy >= 0) paintCell(Math.round(st.piece.x + st.piece.cells[i][0]), Math.round(cy), st.piece.t);
      }
    }
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (st.piece) {
      const p = st.piece;
      const dx = p.plan.c - p.x;
      p.x += Math.max(-SLIDE * dt, Math.min(SLIDE * dt, dx));
      if (p.r !== p.plan.r && Math.abs(dx) < 0.6) {
        const rc = rotCW(p.cells, BOX[p.t]);
        if (!hits(st.grid, rc, Math.floor(p.y), Math.round(p.x))) { p.cells = rc; p.r = (p.r + 1) % 4; }
        else p.r = p.plan.r;
      }
      const target = landingRow(st.grid, p.cells, Math.round(p.x));
      const aligned = Math.abs(dx) < 0.05 && p.r === p.plan.r;
      const ny = p.y + (aligned ? FALL_ALIGNED : DRIFT) * dt;
      p.y = ny >= target ? target : ny;
      if (p.y === target) lock();
    } else {
      spawn();
    }
    st.popT = Math.max(0, st.popT - dt);
    draw();
    // 큐 — 소비 직후 슬롯이 위로 올라오며 사그라든다
    for (let s2 = 0; s2 < st.slots.length; s2++) {
      const a = 1 - 0.10 * s2;
      drawMini(st.slots[s2], st.queue[s2], a * (s2 === 0 && st.popT > 0 ? 0.35 + 0.65 * (1 - st.popT / 0.2) : 1));
    }
    const bagOut = bagRef.current;
    if (bagOut) bagOut.textContent = BAG_WORD + " " + (TYPES.length - st.bagUsed % TYPES.length || TYPES.length) + " / 7";
    rafRef.current = requestAnimationFrame(step);
  }

  // 누르면 하드드롭 — 큐가 바로 한 칸 올라온다
  function onPointerDown(): void {
    const st = stRef.current;
    const p = st.piece;
    if (p) {
      p.x = p.plan.c; p.r = p.plan.r;
      p.cells = shapeRot(p.t, p.plan.r);
      p.y = landingRow(st.grid, p.cells, Math.round(p.x));
      lock();
      st.popT = 0.2;
      if (reduced()) {
        draw();
        for (let i = 0; i < st.slots.length; i++) drawMini(st.slots[i], st.queue[i], 1 - 0.10 * i);
      }
    }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 4줄, 구멍 1칸
    for (let gy0 = ROWS - 4; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    fillQueue();
    // 미니 캔버스 — 큐 슬롯마다 하나 (DOM 에서 만들어 ref 로 보관)
    const queueEl = queueRef.current;
    if (queueEl) {
      for (let s = 0; s < NQ; s++) {
        const mini = document.createElement("canvas");
        mini.className = styles.mini;
        queueEl.appendChild(mini);
        st.slots.push({ el: mini, ctx: mini.getContext("2d"), w: 44, h: 44 });
      }
    }
    fit();
    function onResize(): void {
      fit();
      if (reduced()) {
        draw();
        for (let i = 0; i < st.slots.length; i++) drawMini(st.slots[i], st.queue[i], 1 - 0.10 * i);
      }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정적 한 장 — 큐 다섯 칸이 다 보인다
      draw();
      for (let r2 = 0; r2 < st.slots.length; r2++) drawMini(st.slots[r2], st.queue[r2], 1 - 0.10 * r2);
      const bagOut = bagRef.current;
      if (bagOut) bagOut.textContent = BAG_STILL;
      setStill(true);
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      if (queueEl) queueEl.textContent = "";
      st.slots = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.nq + " " + styles.isStill : styles.nq;
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
            <b className={styles.next}>{L_NEXT}</b>
            <div className={styles.queue} ref={queueRef}></div>
            <p className={styles.bag} ref={bagRef}>가방 0 / 7</p>
          </div>
        </div>
      </div>
    </main>
  );
}
