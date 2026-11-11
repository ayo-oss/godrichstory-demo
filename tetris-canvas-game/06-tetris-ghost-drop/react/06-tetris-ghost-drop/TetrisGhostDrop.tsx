// TetrisGhostDrop — vanilla 판(run/330/demo/06-tetris-ghost-drop/index.html) 의 React 포트.
// 현재 조각을 아래로 끝까지 내려봐서(hits 검사를 반복) 처음 걸리는 y 가 착지점이다.
// 그 자리를 반투명 윤곽으로 먼저 그리고, 스페이스(또는 누르기)를 받으면 그 지점까지
// 한 번에 떨어뜨린다 — 계산은 미리 끝나 있으니 떨어지는 동안에도 착지점은 흔들리지 않는다.
// 하드드롭 대기 0.20초 · 빔 잔상 0.4초 · 부유 낙하 2.6칸/s · 미끄러짐 13칸/s. 값·수치는 vanilla 와 같다.
// SHAPES 원본은 오염시키지 않는다 — 낙하 판은 slice, 회전·하드드롭 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 고스트 윤곽이 뚜렷이 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisGhostDrop.module.scss";

export type TetrisGhostDropProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const COLS = 10, ROWS = 15;
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
const HOLD_DROP = 0.20, BEAM_S = 0.4, DRIFT = 2.6, SLIDE = 13; // 하드드롭 대기 · 빔 잔상 · 부유 낙하 · 미끄러짐

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const GHOST = "#17141a";
const BEAM = "#ff4d1f";
const COLC = "#17141a";

const HINT = "아래로 끝까지 내려 첫 충돌 지점";
const ARIA_FIELD = "고스트 착지점";
const ARIA_COL = "착지 열 분포";
const K_SPACE = "스페이스";
const K_LABEL = "하드드롭";
const UNIT = "칸 남음";
const COUNT_PRE = "떨어뜨림";
const COUNT_POST = "회";

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

export default function TetrisGhostDrop({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: TetrisGhostDropProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const colgRef = useRef<HTMLDivElement | null>(null);
  const ccvRef = useRef<HTMLCanvasElement | null>(null);
  const distRef = useRef<HTMLBRElement | null>(null);
  const countRef = useRef<HTMLBRElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctx2Ref = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, CW: 0, CH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    drops: 0, beamT: 0, holdT: 0, colHist: new Array(COLS).fill(0) as number[]
  }) as Box<{
    W: number; H: number; CW: number; CH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    drops: number; beamT: number; holdT: number; colHist: number[];
  }>;
  const rndRef = useRef(mulberry32(3306)) as Box<() => number>;
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
  }
  function hardDrop(): void {
    const st = stRef.current;
    const p = st.piece;
    if (!p) return;
    // 계획대로 맞춰 착지점까지 한 번에 — beam 은 지나간 자리를 0.4초 밝힌다
    p.x = p.plan.c;
    p.cells = shapeRot(p.t, p.plan.r);
    p.r = p.plan.r;
    const target = landingRow(st.grid, p.cells, Math.round(p.x));
    st.beamT = BEAM_S;
    p.y = target;
    lock();
    st.drops += 1;
    const out = countRef.current;
    if (out) out.textContent = String(st.drops);
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
    st.colHist[rx] += 1;
    if (dead) st.grid = emptyGrid();
    else {
      for (let y = 0; y < ROWS; y++) {
        let n = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
        if (n === COLS) { st.grid.splice(y, 1); st.grid.unshift(new Array(COLS).fill("")); }
      }
    }
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
    const field = fieldRef.current, cv = cvRef.current, colg = colgRef.current, ccv = ccvRef.current;
    if (!field || !cv || !colg || !ccv) return;
    const ctx = cv.getContext("2d"), ctx2 = ccv.getContext("2d");
    if (!ctx || !ctx2) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.CW = colg.clientWidth; st.CH = colg.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ccv.width = Math.round(st.CW * st.dpr); ccv.height = Math.round(st.CH * st.dpr);
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
  function ghostCell(gx: number, gy: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const r = Math.max(2, st.cell * 0.22);
    ctx.beginPath();
    ctx.roundRect(st.ox + gx * st.cell + 2.5, st.oy + gy * st.cell + 2.5, st.cell - 5, st.cell - 5, r);
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = GHOST;
    ctx.stroke();
    ctx.setLineDash([]);
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
      const p = st.piece;
      // 고스트 — 착지점 반투명 윤곽 (매 프레임 다시 계산된다)
      const px = Math.round(p.x);
      const lr = landingRow(st.grid, p.cells, px);
      for (let i = 0; i < p.cells.length; i++) {
        const gyy = lr + p.cells[i][1];
        if (gyy >= 0 && gyy !== Math.floor(p.y) + p.cells[i][1]) ghostCell(px + p.cells[i][0], gyy);
      }
      // 빔 — 하드드롭이 지나간 세로 자리
      if (st.beamT > 0) {
        ctx.globalAlpha = st.beamT / BEAM_S * 0.35;
        ctx.fillStyle = BEAM;
        let minX = 99, maxX = -99;
        for (let b = 0; b < p.cells.length; b++) {
          minX = Math.min(minX, px + p.cells[b][0]);
          maxX = Math.max(maxX, px + p.cells[b][0]);
        }
        for (let bx = minX; bx <= maxX; bx++) ctx.fillRect(st.ox + bx * st.cell, st.oy, st.cell, ROWS * st.cell);
        ctx.globalAlpha = 1;
      }
      // 낙하 조각
      for (let m = 0; m < p.cells.length; m++) {
        const cy = p.y + p.cells[m][1];
        if (cy >= 0) paintCell(px + p.cells[m][0], Math.round(cy), p.t);
      }
      const out = distRef.current;
      if (out) out.textContent = String(Math.max(0, lr - Math.floor(p.y)));
    }
  }
  function drawCol(): void {
    const st = stRef.current;
    const ctx2 = ctx2Ref.current;
    if (!ctx2 || !st.CW || !st.CH) return;
    ctx2.clearRect(0, 0, st.CW, st.CH);
    let max = 1;
    for (let i = 0; i < COLS; i++) max = Math.max(max, st.colHist[i]);
    const bw = st.CW / COLS;
    for (let x = 0; x < COLS; x++) {
      const hh = (st.colHist[x] / max) * st.CH;
      ctx2.fillStyle = COLC;
      ctx2.globalAlpha = 0.4 + 0.6 * (st.colHist[x] / max);
      ctx2.fillRect(x * bw + 1, st.CH - hh, bw - 2, hh);
    }
    ctx2.globalAlpha = 1;
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (st.beamT > 0) st.beamT -= dt;
    if (!st.piece) { spawn(); st.holdT = HOLD_DROP; }
    else {
      const p = st.piece;
      const dx = p.plan.c - p.x;
      p.x += Math.max(-SLIDE * dt, Math.min(SLIDE * dt, dx));
      if (p.r !== p.plan.r && Math.abs(dx) < 0.6) {
        const rc = rotCW(p.cells, BOX[p.t]);
        if (!hits(st.grid, rc, Math.floor(p.y), Math.round(p.x))) { p.cells = rc; p.r = (p.r + 1) % 4; }
        else p.r = p.plan.r;
      }
      if (Math.abs(dx) < 0.05 && p.r === p.plan.r) {
        st.holdT -= dt;
        if (st.holdT <= 0) { hardDrop(); }
        else {
          // 대기 중 부유 — 거리 숫자가 매 프레임 줄어든다
          p.y += DRIFT * dt;
          const px2 = Math.round(p.x);
          const lr2 = landingRow(st.grid, p.cells, px2);
          if (Math.floor(p.y) >= lr2) { p.y = lr2; hardDrop(); }
        }
      }
    }
    draw();
    drawCol();
    rafRef.current = requestAnimationFrame(step);
  }

  // 키 — 스페이스 하드드롭 (keydown)
  function onKeyDown(e: KeyEvt): void {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (stRef.current.piece) hardDrop();
      if (reduced()) { draw(); drawCol(); }
    }
  }
  function onPointerDown(): void {
    if (stRef.current.piece) hardDrop();
    if (reduced()) { draw(); drawCol(); }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 4줄
    for (let gy0 = ROWS - 4; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(); drawCol(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 고스트가 뚜렷이 보이는 상태
      st.piece = { t: "T", r: 0, cells: SHAPES.T.slice(), x: 4, y: 4.0, plan: { r: 0, c: 4 } };
      draw(); drawCol();
      const out = distRef.current;
      if (out && st.piece) out.textContent = String(landingRow(st.grid, st.piece.cells, 4) - 4);
      setStill(true);
    } else {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(step);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootCls = still ? styles.gh + " " + styles.isStill : styles.gh;
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
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
          >
            <canvas className={styles.cv} ref={cvRef}></canvas>
          </div>
          <div className={styles.side}>
            <span className={styles.k}>{K_SPACE}</span>
            <span className={styles.kLabel}>{K_LABEL}</span>
            <b className={styles.dist} ref={distRef} aria-live="polite">0</b>
            <span className={styles.unit}>{UNIT}</span>
            <p className={styles.count}>{COUNT_PRE} <b ref={countRef}>0</b>{COUNT_POST}</p>
            <div className={styles.col} ref={colgRef} role="img" aria-label={ARIA_COL}>
              <canvas ref={ccvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
