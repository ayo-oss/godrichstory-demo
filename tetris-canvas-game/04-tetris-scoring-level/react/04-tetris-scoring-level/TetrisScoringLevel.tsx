// TetrisScoringLevel — vanilla 판(run/330/demo/04-tetris-scoring-level/index.html) 의 React 포트.
// 한 번에 지운 줄 수 n 에 대해 점수 = 100 × n × n (지수 보상: 1줄 100 · 2줄 400 · 3줄 900 · 4줄 1600).
// 누적 줄이 4줄 늘 때마다 레벨이 오르고 낙하 간격은 BASE × 0.85^(레벨−1) 로 줄어든다 —
// 레벨이 숫자가 아니라 속도로 느껴진다. 최고점은 localStorage 에 남는다.
// 착지까지 낙하는 42칸/s clamp, 미끄러짐 12칸/s. 값·수치는 vanilla 와 같다.
// SHAPES 원본은 오염시키지 않는다 — 회전·하드드롭 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 점수·레벨·간격이 다 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisScoringLevel.module.scss";

export type TetrisScoringLevelProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 10, ROWS = 14;
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
const BASE_IV = 0.50, FACTOR = 0.85, LINES_PER_LV = 4; // 낙하 간격 초 · 레벨 계수 · 줄 수
const FALL = 42, SLIDE = 12, DRIFT = 5; // 착지 낙하 42칸/s · 미끄러짐 12칸/s · 대기 낙하 5칸/s
const BEST_KEY = "p330-04-best";

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const POPC = "#c93000";
const BARC = "#0a4fe8";

const HINT = "동시 클리어 배율 1 · 2 · 3 · 4배";
const ARIA_FIELD = "점수와 레벨";
const ARIA_GRAPH = "클리어 배율 기록";
const L_SCORE = "점수";
const L_LEVEL = "레벨";
const L_IV = "낙하 간격";
const L_BEST = "최고점";
const LV_POP = "레벨 ";

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

type Grid = string[][];
type Piece = { t: string; r: number; cells: number[][]; x: number; y: number; plan: { r: number; c: number } };
type Pop = { txt: string; t: number };

export default function TetrisScoringLevel({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8"
}: TetrisScoringLevelProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const gcvRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef<HTMLBRElement | null>(null);
  const lvRef = useRef<HTMLBRElement | null>(null);
  const ivRef = useRef<HTMLBRElement | null>(null);
  const bestRef = useRef<HTMLBRElement | null>(null);
  const mfillRef = useRef<HTMLElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctx2Ref = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, GW: 0, GH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    score: 0, lines: 0, level: 1, best: 0,
    pops: [] as Pop[], history: [] as number[],
    flashRows: [] as number[], flashT: 0, fallT: 0, restT: 0, slideT: 0
  }) as Box<{
    W: number; H: number; GW: number; GH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    score: number; lines: number; level: number; best: number;
    pops: Pop[]; history: number[];
    flashRows: number[]; flashT: number; fallT: number; restT: number; slideT: number;
  }>;
  const rndRef = useRef(mulberry32(3304)) as Box<() => number>;
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
  // 1수 탐색 — 완성 줄을 최우선, 그다음 구멍
  function choose(grid: Grid, t: string): { r: number; c: number } | null {
    let best: { r: number; c: number; score: number } | null = null;
    for (let r = 0; r < 4; r++) {
      let cells = SHAPES[t].map((c) => c.slice());
      const n = BOX[t];
      for (let k = 0; k < r; k++) cells = rotCW(cells, n);
      for (let c = -2; c < COLS; c++) {
        if (hits(grid, cells, 0, c)) continue;
        const row = landingRow(grid, cells, c);
        if (row < 0) continue;
        const g2 = cloneGrid(grid);
        for (let i = 0; i < cells.length; i++) g2[row + cells[i][1]][c + cells[i][0]] = t;
        let full = 0, holes = 0;
        for (let y = 0; y < ROWS; y++) {
          let f = 0;
          for (let x = 0; x < COLS; x++) if (g2[y][x]) f += 1;
          if (f === COLS) full += 1;
        }
        for (let x2 = 0; x2 < COLS; x2++) {
          let seen = false;
          for (let y2 = 0; y2 < ROWS; y2++) {
            if (g2[y2][x2]) seen = true;
            else if (seen) holes += 1;
          }
        }
        const score = full * 1000 - holes * 800 - row;
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
  function spawn(): void {
    const st = stRef.current;
    if (!st.bag.length) refill();
    const t = st.bag.pop() as string;
    let plan = choose(st.grid, t);
    if (!plan) { st.grid = emptyGrid(); plan = choose(st.grid, t) as { r: number; c: number }; }
    st.piece = { t: t, r: 0, cells: SHAPES[t].slice(), x: 3, y: -0.4, plan: plan };
    st.fallT = 0; st.restT = 0; st.slideT = 0;
  }
  function dropIv(): number {
    return Math.max(0.06, BASE_IV * Math.pow(FACTOR, stRef.current.level - 1));
  }
  function fmtIv(): string {
    return String(Math.round(dropIv() * 1000));
  }
  // localStorage — 최고점. 파일 경로에서도 동작, 실패해도 게임은 계속
  function loadBest(): number {
    try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch { return 0; }
  }
  function saveBest(): void {
    const st = stRef.current;
    if (st.score > st.best) {
      st.best = st.score;
      const out = bestRef.current;
      if (out) out.textContent = String(st.best);
      try { localStorage.setItem(BEST_KEY, String(st.best)); } catch { /* 저장 실패는 무시 */ }
    }
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
      st.flashRows = [];
      for (let y = 0; y < ROWS; y++) {
        let n2 = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n2 += 1;
        if (n2 === COLS) st.flashRows.push(y);
      }
      if (st.flashRows.length) {
        // 지수 보상 — 점수 = 100 × n × n (1·2·3·4배)
        const n = st.flashRows.length;
        const add = 100 * n * n;
        st.score += add; st.lines += n;
        const sOut = scoreRef.current;
        if (sOut) sOut.textContent = String(st.score);
        st.pops.push({ txt: n + "배 +" + add, t: 1.0 });
        st.history.push(n);
        if (st.history.length > 26) st.history.shift();
        const nl = 1 + Math.floor(st.lines / LINES_PER_LV);
        if (nl !== st.level) {
          st.level = nl;
          const lOut = lvRef.current, iOut = ivRef.current;
          if (lOut) lOut.textContent = String(st.level);
          if (iOut) iOut.textContent = fmtIv();
          st.pops.push({ txt: LV_POP + st.level, t: 1.2 });
        }
        saveBest();
        st.flashT = 0.18;
      }
    }
    st.piece = null;
  }
  function spliceRows(): void {
    const st = stRef.current;
    st.flashRows.sort((a, b) => a - b);
    for (let i = 0; i < st.flashRows.length; i++) {
      st.grid.splice(st.flashRows[i], 1);
      st.grid.unshift(new Array(COLS).fill(""));
    }
    st.flashRows = [];
    // 판이 얇아지면 쓰레기 보충 — 클리어 리듬이 계속되게
    let filled = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (st.grid[y][x]) filled += 1;
    if (filled < COLS * 3) {
      for (let gy = ROWS - 4; gy < ROWS; gy++) {
        const h = Math.floor(rndRef.current() * COLS);
        for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === h ? "" : TYPES[Math.floor(rndRef.current() * 7)];
      }
    }
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current, graph = graphRef.current, gcv = gcvRef.current;
    if (!field || !cv || !graph || !gcv) return;
    const ctx = cv.getContext("2d"), ctx2 = gcv.getContext("2d");
    if (!ctx || !ctx2) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.GW = graph.clientWidth; st.GH = graph.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    gcv.width = Math.round(st.GW * st.dpr); gcv.height = Math.round(st.GH * st.dpr);
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
    const r = Math.max(2, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(st.ox + gx * st.cell + 1, st.oy + gy * st.cell + 1, st.cell - 2, st.cell - 2, r);
    ctx.fillStyle = FILL[t]; ctx.fill();
    ctx.lineWidth = Math.max(1, st.cell * 0.14);
    ctx.strokeStyle = EDGE[t]; ctx.stroke();
    ctx.globalAlpha = 1;
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
    if (st.flashT > 0) {
      ctx.globalAlpha = Math.min(1, st.flashT / 0.18) * 0.85;
      ctx.fillStyle = POPC;
      for (let f = 0; f < st.flashRows.length; f++) ctx.fillRect(st.ox, st.oy + st.flashRows[f] * st.cell, st.cell * COLS, st.cell);
      ctx.globalAlpha = 1;
    }
    if (st.piece) {
      for (let i = 0; i < st.piece.cells.length; i++) {
        const cy = st.piece.y + st.piece.cells[i][1];
        if (cy >= 0) paintCell(Math.round(st.piece.x + st.piece.cells[i][0]), Math.round(cy), st.piece.t);
      }
    }
  }
  function drawGraph(): void {
    const st = stRef.current;
    const ctx2 = ctx2Ref.current;
    if (!ctx2 || !st.GW || !st.GH) return;
    ctx2.clearRect(0, 0, st.GW, st.GH);
    const bw = st.GW / 13;
    const start = Math.max(0, st.history.length - 13);
    for (let i = start; i < st.history.length; i++) {
      const n = st.history[i];
      const hh = (n / 4) * st.GH;
      ctx2.fillStyle = BARC;
      ctx2.globalAlpha = 0.45 + 0.55 * (n / 4);
      ctx2.fillRect((i - start) * bw + 1, st.GH - hh, bw - 2, hh);
    }
    ctx2.globalAlpha = 1;
  }
  function meterFill(): void {
    const st = stRef.current;
    const mfill = mfillRef.current;
    if (!mfill) return;
    const ratio = 1 - (dropIv() - 0.06) / (BASE_IV - 0.06);
    mfill.style.height = Math.round(Math.max(0.04, Math.min(1, ratio)) * 100) + "%";
  }

  function step(now: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (st.flashT > 0) {
      st.flashT -= dt;
      if (st.flashT <= 0) spliceRows();
    } else if (!st.piece) {
      spawn();
    } else {
      const p = st.piece;
      // 계획 열로 미끄러지며 동시에 서서히 내려온다 (초당 5칸). 정렬되면 착지점까지
      // 상속 속도로 내려 놓는다 — 팝 리듬이 초당 한 번 이상 이어진다
      const dx = p.plan.c - p.x;
      p.x += Math.max(-SLIDE * dt, Math.min(SLIDE * dt, dx));
      if (p.r !== p.plan.r && Math.abs(dx) < 0.6 && st.restT === 0) {
        const rc = rotCW(p.cells, BOX[p.t]);
        if (!hits(st.grid, rc, Math.floor(p.y), Math.round(p.x))) {
          p.cells = rc; p.r = (p.r + 1) % 4;
        } else p.r = p.plan.r;
      }
      const target = landingRow(st.grid, p.cells, Math.round(p.x));
      if (Math.abs(dx) < 0.05 && p.r === p.plan.r) {
        // 일정 속도 낙하 — 착지 행까지 상속 속도(42칸/s)로 내려온 뒤 딱 잠근다
        const ny = p.y + FALL * dt;
        p.y = ny >= target ? target : ny;
        if (p.y === target) lock();
      } else {
        p.y += DRIFT * dt;
        const ry0 = Math.floor(p.y) + 1;
        if (hits(st.grid, p.cells, ry0, Math.round(p.x))) { p.y = ry0 - 1; lock(); }
      }
    }
    // 배율 팝 — 보드 안에서 떠오른다
    if (ctx) {
      for (let pi = st.pops.length - 1; pi >= 0; pi--) {
        st.pops[pi].t -= dt;
        if (st.pops[pi].t <= 0) { st.pops.splice(pi, 1); continue; }
        ctx.font = "700 " + Math.max(11, st.cell * 0.9) + "px sans-serif";
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.min(1, st.pops[pi].t);
        ctx.fillStyle = POPC;
        ctx.fillText(st.pops[pi].txt, st.ox + COLS * st.cell / 2, st.oy + ROWS * st.cell * 0.35 - (1 - st.pops[pi].t) * 18);
        ctx.globalAlpha = 1;
      }
    }
    // 낙하 간격 게이지 — 간격이 짧아질수록 채워진다
    meterFill();
    draw();
    drawGraph();
    rafRef.current = requestAnimationFrame(step);
  }

  // 누르면 하드드롭 — 다음 클리어와 배율이 바로 보인다
  function onPointerDown(): void {
    const st = stRef.current;
    const p = st.piece;
    if (p) {
      p.x = p.plan.c; p.r = p.plan.r;
      let c2 = SHAPES[p.t].map((c) => c.slice());
      const n = BOX[p.t];
      for (let k = 0; k < p.plan.r; k++) c2 = rotCW(c2, n);
      p.cells = c2;
      p.y = landingRow(st.grid, p.cells, Math.round(p.x));
      lock();
      if (reduced()) { draw(); drawGraph(); }
    }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 5줄, 구멍 1칸씩 (01 과 같은 구성)
    for (let gy0 = ROWS - 5; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    st.best = loadBest();
    const bOut = bestRef.current;
    if (bOut) bOut.textContent = String(st.best);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(); drawGraph(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 점수·레벨·간격이 다 보이는 상태로 만들어 둔다
      st.score = 1600; st.lines = 6; st.level = 2;
      const sOut = scoreRef.current, lOut = lvRef.current, iOut = ivRef.current;
      if (sOut) sOut.textContent = String(st.score);
      if (lOut) lOut.textContent = String(st.level);
      if (iOut) iOut.textContent = fmtIv();
      st.history = [1, 1, 2, 1, 3, 2, 1, 4];
      for (let g2y = ROWS - 3; g2y < ROWS; g2y++) for (let g2x = 0; g2x < COLS - 2; g2x++) st.grid[g2y][g2x] = TYPES[(g2x + g2y) % 7];
      draw(); drawGraph();
      meterFill();
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

  const rootCls = still ? styles.sc + " " + styles.isStill : styles.sc;
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
            <span className={styles.label}>{L_SCORE}</span>
            <b className={styles.score} ref={scoreRef} aria-live="polite">0</b>
            <div className={styles.lvRow}>
              <span className={styles.label}>{L_LEVEL}</span>
              <b className={styles.lv} ref={lvRef}>1</b>
            </div>
            <span className={styles.iv}>{L_IV} <b ref={ivRef}>500</b>ms</span>
            <div className={styles.meter}><i ref={mfillRef}></i></div>
            <div className={styles.graph} ref={graphRef} role="img" aria-label={ARIA_GRAPH}>
              <canvas ref={gcvRef}></canvas>
            </div>
            <span className={styles.best}>{L_BEST} <b ref={bestRef}>0</b></span>
          </div>
        </div>
      </div>
    </main>
  );
}
