// TetrisHoldSwap — vanilla 판(run/330/demo/07-tetris-hold-swap/index.html) 의 React 포트.
// 현재 조각을 보관 칸에 넣고 큐의 것과 맞바꾼다. 한 번 놓을 때 한 번만 통과되는
// canHold 플래그가 무한 바꾸기를 막는다 — 이 규칙까지 상태 계산에 들어 있다.
// 데모: 조각이 내려오다 잠기기 전에 (전략상 유리한 때에) 홀드를 쓰고, 규칙 때문에
// 두 번째 시도는 거절된다. 거절은 보드에 붉은 표시로 보인다.
// 자동 홀드 시도 간격 0.35→0.4초 · 부유 4칸/s · 시도 후 즉시 낙하 26칸/s · 미끄러짐 13칸/s.
// 값·수치는 vanilla 와 같다. SHAPES 원본은 오염시키지 않는다 — 회전·맞바꿈 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 홀드 칸 잠김 상태까지 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisHoldSwap.module.scss";

export type TetrisHoldSwapProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

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
const HOLD_FIRST = 0.35, HOLD_NEXT = 0.4, DRIFT = 4, FALL_FAST = 26, SLIDE = 13;

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const OKC = "#4cd4a6";
const NOC = "#ffd23f";

const HINT = "한 번 놓을 때 한 번만 — 홀드 규칙";
const ARIA_FIELD = "홀드";
const ARIA_HOLD = "홀드 칸";
const ARIA_LOG = "스왑 기록";
const K_SHIFT = "시프트";
const UNIT = "번 바꿨습니다";

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
type Piece = { t: string; r: number; cells: number[][]; x: number; y: number; plan: { r: number; c: number }; usedHold: boolean };
type Mark = { x: number; y: number; ok: boolean; t: number };

export default function TetrisHoldSwap({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a"
}: TetrisHoldSwapProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const holdboxRef = useRef<HTMLDivElement | null>(null);
  const hcvRef = useRef<HTMLCanvasElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const lcvRef = useRef<HTMLCanvasElement | null>(null);
  const swapRef = useRef<HTMLBRElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const hctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, HW: 0, HH: 0, LW: 0, LH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    held: null as string | null, canHold: true, swaps: 0, marks: [] as Mark[],
    holdTryT: 0, holdTryN: 0
  }) as Box<{
    W: number; H: number; HW: number; HH: number; LW: number; LH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    held: string | null; canHold: boolean; swaps: number; marks: Mark[];
    holdTryT: number; holdTryN: number;
  }>;
  const rndRef = useRef(mulberry32(3307)) as Box<() => number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [locked, setLocked] = useState(false);
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
  function nextType(): string {
    const st = stRef.current;
    if (!st.bag.length) refill();
    return st.bag.pop() as string;
  }

  function spawn(): void {
    const st = stRef.current;
    const t = nextType();
    let plan = choose(st.grid, t);
    if (!plan) { st.grid = emptyGrid(); plan = choose(st.grid, t) as { r: number; c: number }; }
    st.piece = { t: t, r: 0, cells: SHAPES[t].slice(), x: 2, y: -0.4, plan: plan, usedHold: false };
  }
  function tryHold(): void {
    const st = stRef.current;
    const p = st.piece;
    if (!p) return;
    if (!st.canHold) {
      // 거절 — 규칙 위반 표시
      st.marks.push({ x: Math.round(p.x), y: Math.max(0, Math.floor(p.y)), ok: false, t: 1.0 });
      return;
    }
    const cur = p.t;
    if (st.held === null) {
      st.held = cur;
      st.piece = null; // 다음 큐 조각으로
      st.canHold = true; // 새 조각이니 허용
    } else {
      let swapIn = st.held;
      st.held = cur;
      let plan = choose(st.grid, swapIn);
      if (!plan) { swapIn = cur; st.held = cur; plan = p.plan; }
      st.piece = { t: swapIn, r: 0, cells: SHAPES[swapIn].slice(), x: 2, y: -0.4, plan: plan, usedHold: true };
    }
    st.canHold = st.piece && st.piece.usedHold ? false : true;
    if (st.piece === null) st.canHold = true;
    st.swaps += 1;
    const out = swapRef.current;
    if (out) out.textContent = String(st.swaps);
    st.marks.push({ x: st.piece ? Math.round(st.piece.x) : 2, y: st.piece ? Math.max(0, Math.floor(st.piece.y)) : 0, ok: true, t: 0.8 });
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
    let filled = 0;
    for (let y2 = 0; y2 < ROWS; y2++) for (let x2 = 0; x2 < COLS; x2++) if (st.grid[y2][x2]) filled += 1;
    if (filled < COLS * 2) {
      for (let gy = ROWS - 3; gy < ROWS; gy++) {
        const h = Math.floor(rndRef.current() * COLS);
        for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === h ? "" : TYPES[Math.floor(rndRef.current() * 7)];
      }
    }
    st.piece = null;
    st.canHold = true; // 놓았다 — 다음 조각에 다시 허용
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current, holdbox = holdboxRef.current, hcv = hcvRef.current, log = logRef.current, lcv = lcvRef.current;
    if (!field || !cv || !holdbox || !hcv || !log || !lcv) return;
    const ctx = cv.getContext("2d"), hctx = hcv.getContext("2d"), lctx = lcv.getContext("2d");
    if (!ctx || !hctx || !lctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.HW = holdbox.clientWidth; st.HH = holdbox.clientHeight;
    st.LW = log.clientWidth; st.LH = log.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    hcv.width = Math.round(st.HW * st.dpr); hcv.height = Math.round(st.HH * st.dpr);
    hctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    lcv.width = Math.round(st.LW * st.dpr); lcv.height = Math.round(st.LH * st.dpr);
    lctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    hctxRef.current = hctx;
    lctxRef.current = lctx;
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
  function drawMini(c: CanvasRenderingContext2D | null, w: number, h: number, t: string | null): void {
    if (!c) return;
    c.clearRect(0, 0, w, h);
    if (!t) return;
    const cells = SHAPES[t];
    let minX = 9, maxX = -9, minY = 9, maxY = -9;
    for (let i = 0; i < cells.length; i++) {
      minX = Math.min(minX, cells[i][0]); maxX = Math.max(maxX, cells[i][0]);
      minY = Math.min(minY, cells[i][1]); maxY = Math.max(maxY, cells[i][1]);
    }
    const pw = maxX - minX + 1, ph = maxY - minY + 1;
    const mc = Math.min(w / 4.2, h / 4.2);
    const mx = (w - pw * mc) / 2, my = (h - ph * mc) / 2;
    for (let k = 0; k < cells.length; k++) {
      c.beginPath();
      c.roundRect(mx + (cells[k][0] - minX) * mc + 1, my + (cells[k][1] - minY) * mc + 1, mc - 2, mc - 2, Math.max(2, mc * 0.22));
      c.fillStyle = FILL[t]; c.fill();
      c.lineWidth = Math.max(1.5, mc * 0.13);
      c.strokeStyle = EDGE[t]; c.stroke();
    }
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
    // 결과 표시 — 초록(성공)·붉은(거절) 원
    for (let m = st.marks.length - 1; m >= 0; m--) {
      const mk = st.marks[m];
      const cx2 = st.ox + mk.x * st.cell + st.cell / 2, cy2 = st.oy + mk.y * st.cell + st.cell / 2;
      ctx.globalAlpha = Math.min(1, mk.t);
      ctx.beginPath();
      ctx.arc(cx2, cy2, st.cell * 0.62, 0, Math.PI * 2);
      ctx.fillStyle = mk.ok ? OKC : NOC;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // 홀드 칸 — canHold 상태를 테두리로
    drawMini(hctxRef.current, st.HW, st.HH, st.held);
    setLocked(!st.canHold);
  }
  function drawLog(): void {
    const st = stRef.current;
    const lctx = lctxRef.current;
    if (!lctx || !st.LW || !st.LH) return;
    lctx.clearRect(0, 0, st.LW, st.LH);
    // 최근 12번 시도 — 초록/붉은 점
    const n = Math.min(12, st.marks.length);
    const bw = st.LW / 12;
    for (let i = 0; i < n; i++) {
      const m = st.marks[st.marks.length - 1 - i];
      lctx.globalAlpha = 0.25 + 0.75 * (1 - i / 12);
      lctx.fillStyle = m.ok ? OKC : NOC;
      const bx = st.LW - (i + 1) * bw;
      lctx.fillRect(bx + 1, 0, bw - 2, st.LH * (m.ok ? 1 : 0.45));
    }
    lctx.globalAlpha = 1;
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    for (let m = st.marks.length - 1; m >= 0; m--) {
      st.marks[m].t -= dt;
      if (st.marks[m].t <= 0) st.marks.splice(m, 1);
    }
    if (!st.piece) { spawn(); st.holdTryT = HOLD_FIRST; st.holdTryN = 0; }
    else {
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
      st.holdTryT -= dt;
      if (aligned && st.holdTryN < 2 && st.holdTryT <= 0) {
        tryHold();       // 1번째는 성공, 2번째는 (아직 안 놓았으니) 거절
        st.holdTryN += 1;
        st.holdTryT = HOLD_NEXT;
      } else {
        // 부유 — 두 번 다 시도했으면 즉시 내려 놓는다 (리듬이 끊기지 않게)
        const ny = p.y + (st.holdTryN >= 2 ? FALL_FAST : DRIFT) * dt;
        p.y = ny >= target ? target : ny;
        if (p.y === target) lock();
      }
    }
    draw();
    drawLog();
    rafRef.current = requestAnimationFrame(step);
  }

  // 키 — 시프트 홀드 (keydown)
  function onKeyDown(e: KeyEvt): void {
    if (e.key === "Shift") {
      e.preventDefault();
      if (stRef.current.piece) tryHold();
      if (reduced()) { draw(); drawLog(); }
    }
  }
  function onPointerDown(): void {
    if (stRef.current.piece) tryHold();
    if (reduced()) { draw(); drawLog(); }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 3줄
    for (let gy0 = ROWS - 3; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(); drawLog(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 홀드 칸 잠김 상태까지 보인다
      st.held = "I"; st.canHold = false;
      st.piece = { t: "L", r: 0, cells: SHAPES.L.slice(), x: 3, y: 2, plan: { r: 0, c: 3 }, usedHold: false };
      st.marks = [{ x: 3, y: 2, ok: true, t: 1 }, { x: 3, y: 4, ok: false, t: 1 }];
      draw(); drawLog();
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

  const rootCls = still ? styles.hd + " " + styles.isStill : styles.hd;
  const holdCls = locked ? styles.hold + " " + styles.isLocked : styles.hold;
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
            <span className={styles.k}>{K_SHIFT}</span>
            <div className={holdCls} ref={holdboxRef} role="img" aria-label={ARIA_HOLD}>
              <canvas ref={hcvRef}></canvas>
            </div>
            <b className={styles.swapN} ref={swapRef} aria-live="polite">0</b>
            <span className={styles.unit}>{UNIT}</span>
            <div className={styles.log} ref={logRef} role="img" aria-label={ARIA_LOG}>
              <canvas ref={lcvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
