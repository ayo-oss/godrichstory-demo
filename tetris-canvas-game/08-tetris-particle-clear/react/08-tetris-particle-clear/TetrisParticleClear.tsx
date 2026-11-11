// TetrisParticleClear — vanilla 판(run/330/demo/08-tetris-particle-clear/index.html) 의 React 포트.
// 지워진 각 칸을 여섯 개의 작은 사각 입자로 바꾼다. 매 프레임
// v += g·dt (중력), p += v·dt (속도 적분) 로 움직인다 — 라이브러리 없는 순수 계산.
// 같은 격자 게임이지만 이번 항목의 주인공은 보드가 아니라 흩어지는 입자다.
// 칸마다 입자 여섯 개 · 중력 30칸/s² · 수명 1.1초 · 정렬 전 5칸/s · 정렬 후 34칸/s · 미끄러짐 13칸/s.
// 값·수치는 vanilla 와 같다. SHAPES 원본은 오염시키지 않는다 — 회전 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 터진 직후 입자 몇 개를 정적으로 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisParticleClear.module.scss";

export type TetrisParticleClearProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 10, ROWS = 12;
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
const PER_CELL = 6;        // 칸마다 입자 수
const GRAV = 30;           // 중력 (칸/s²)
const LIFE = 1.1;          // 입자 수명 (초)
const FLASH_S = 0.14;      // 클리어 섬광 (초)
const FALL_ALIGNED = 34, DRIFT = 5, SLIDE = 13; // 정렬 후 34칸/s · 정렬 전 5칸/s · 미끄러짐 13칸/s

const FILL: Record<string, string> = {
  I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6"
};
const EDGE: Record<string, string> = {
  I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042"
};
const LINE = "rgba(23,20,26,.10)";
const FLASH = "#ff4d1f";

const HINT = "칸마다 입자 여섯 개 · 속도·중력 적분";
const ARIA_FIELD = "클리어 파티클";
const ARIA_SKY = "입자 흩어짐 궤적";
const UNIT = "개 입자";
const C_PRE = "클리어 ";
const C_POST = "줄";

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
type Particle = { x: number; y: number; vx: number; vy: number; t: number; c: string; sz: number };
type Trail = { x: number; y: number; a: number; c: string };

export default function TetrisParticleClear({
  duration = "2s",
  easing = "ease-out",
  color = "#c93000"
}: TetrisParticleClearProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const scvRef = useRef<HTMLCanvasElement | null>(null);
  const pnRef = useRef<HTMLElement | null>(null);
  const cnRef = useRef<HTMLElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, SW: 0, SH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    particles: [] as Particle[], trails: [] as Trail[],
    clearedRows: 0, flashT: 0, flashRows: [] as number[]
  }) as Box<{
    W: number; H: number; SW: number; SH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    particles: Particle[]; trails: Trail[];
    clearedRows: number; flashT: number; flashRows: number[];
  }>;
  const rndRef = useRef(mulberry32(3308)) as Box<() => number>;
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
        let full = 0, holes = 0;
        for (let y = 0; y < ROWS; y++) {
          let f = 0;
          for (let x = 0; x < COLS; x++) if (g2[y][x]) f += 1;
          if (f === COLS) full += 1;
        }
        for (let x2 = 0; x2 < COLS; x2++) {
          let seen = false;
          for (let y2 = 0; y2 < ROWS; y2++) { if (g2[y2][x2]) seen = true; else if (seen) holes += 1; }
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
      st.flashRows = [];
      for (let y = 0; y < ROWS; y++) {
        let n = 0;
        for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
        if (n === COLS) st.flashRows.push(y);
      }
      if (st.flashRows.length) {
        // 칸 → 입자 폭발
        for (let f = 0; f < st.flashRows.length; f++) {
          for (let x2 = 0; x2 < COLS; x2++) {
            const t2 = st.grid[st.flashRows[f]][x2];
            for (let k = 0; k < PER_CELL; k++) {
              st.particles.push({
                x: x2 + 0.15 + rndRef.current() * 0.7, y: st.flashRows[f] + 0.15 + rndRef.current() * 0.7,
                vx: (rndRef.current() - 0.5) * 10, vy: -2 - rndRef.current() * 8,
                t: LIFE * (0.6 + rndRef.current() * 0.4),
                c: k % 2 ? FILL[t2] : EDGE[t2],
                sz: 0.10 + rndRef.current() * 0.16
              });
            }
          }
        }
        st.clearedRows += st.flashRows.length;
        const out = cnRef.current;
        if (out) out.textContent = String(st.clearedRows);
        st.flashT = FLASH_S;
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
    const field = fieldRef.current, cv = cvRef.current, sky = skyRef.current, scv = scvRef.current;
    if (!field || !cv || !sky || !scv) return;
    const ctx = cv.getContext("2d"), sctx = scv.getContext("2d");
    if (!ctx || !sctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.SW = sky.clientWidth; st.SH = sky.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    scv.width = Math.round(st.SW * st.dpr); scv.height = Math.round(st.SH * st.dpr);
    sctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    sctxRef.current = sctx;
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
      ctx.globalAlpha = Math.min(1, st.flashT / FLASH_S) * 0.9;
      ctx.fillStyle = FLASH;
      for (let f = 0; f < st.flashRows.length; f++) ctx.fillRect(st.ox, st.oy + st.flashRows[f] * st.cell, st.cell * COLS, st.cell);
      ctx.globalAlpha = 1;
    }
    if (st.piece) {
      for (let i = 0; i < st.piece.cells.length; i++) {
        const cy = st.piece.y + st.piece.cells[i][1];
        if (cy >= 0) paintCell(Math.round(st.piece.x + st.piece.cells[i][0]), Math.round(cy), st.piece.t);
      }
    }
    // 입자 — 속도·중력 적분 결과
    for (let p = 0; p < st.particles.length; p++) {
      const pt = st.particles[p];
      ctx.globalAlpha = Math.min(1, pt.t / 0.3);
      ctx.fillStyle = pt.c;
      const s = pt.sz * st.cell;
      ctx.fillRect(st.ox + pt.x * st.cell - s / 2, st.oy + pt.y * st.cell - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    const out = pnRef.current;
    if (out) out.textContent = String(st.particles.length);
  }
  function drawSky(dt: number): void {
    const st = stRef.current;
    const sctx = sctxRef.current;
    if (!sctx || !st.SW || !st.SH) return;
    // 흩어진 입자의 궤적 — 사그라드는 점
    sctx.clearRect(0, 0, st.SW, st.SH);
    for (let t2 = st.trails.length - 1; t2 >= 0; t2--) {
      const tr = st.trails[t2];
      tr.a -= dt / 1.0;
      if (tr.a <= 0) { st.trails.splice(t2, 1); continue; }
      sctx.globalAlpha = tr.a * 0.5;
      sctx.fillStyle = tr.c;
      sctx.fillRect(tr.x * st.SW - 1.5, tr.y * st.SH - 1.5, 3, 3);
    }
    sctx.globalAlpha = 1;
    if (st.trails.length > 400) st.trails.splice(0, st.trails.length - 400);
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    // 입자 적분 — v += g·dt, p += v·dt
    for (let p = st.particles.length - 1; p >= 0; p--) {
      const pt = st.particles[p];
      pt.vy += GRAV * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.t -= dt;
      if (pt.t <= 0 || pt.y > ROWS + 1) { st.particles.splice(p, 1); continue; }
      // 궤적 기록 (하늘 패널 좌표)
      if (Math.random() < 0.25) st.trails.push({ x: Math.min(1, Math.max(0, pt.x / COLS)), y: Math.min(1, Math.max(0, pt.y / ROWS)), a: 1, c: pt.c });
    }
    if (st.flashT > 0) {
      st.flashT -= dt;
      if (st.flashT <= 0) spliceRows();
    } else if (!st.piece) {
      spawn();
    } else {
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
    }
    draw();
    drawSky(dt);
    rafRef.current = requestAnimationFrame(step);
  }

  // 누르면 폭발 재현 — 아래쪽 두 줄을 강제로 터뜨린다
  function onPointerDown(): void {
    const st = stRef.current;
    for (let y = ROWS - 2; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t2 = st.grid[y][x] || TYPES[Math.floor(rndRef.current() * 7)];
        for (let k = 0; k < PER_CELL; k++) {
          st.particles.push({
            x: x + 0.2 + rndRef.current() * 0.6, y: y + 0.2 + rndRef.current() * 0.6,
            vx: (rndRef.current() - 0.5) * 12, vy: -4 - rndRef.current() * 8,
            t: LIFE * (0.7 + rndRef.current() * 0.3),
            c: k % 2 ? FILL[t2] : EDGE[t2],
            sz: 0.10 + rndRef.current() * 0.16
          });
        }
      }
      st.grid.splice(y, 1);
      st.grid.unshift(new Array(COLS).fill(""));
    }
    st.clearedRows += 2;
    const out = cnRef.current;
    if (out) out.textContent = String(st.clearedRows);
    if (reduced()) { draw(); drawSky(0); }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 5줄, 줄마다 구멍 1칸
    for (let gy0 = ROWS - 5; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(); drawSky(0); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 터진 직후의 입자 몇 개를 정적으로 보인다
      for (let k2 = 0; k2 < 30; k2++) {
        st.particles.push({ x: rndRef.current() * COLS, y: 2 + rndRef.current() * 4, vx: 0, vy: 0, t: 9, c: k2 % 2 ? FILL.T : EDGE.T, sz: 0.12 + rndRef.current() * 0.1 });
      }
      draw(); drawSky(0);
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

  const rootCls = still ? styles.pt + " " + styles.isStill : styles.pt;
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
            <b className={styles.n} ref={pnRef} aria-live="polite">0</b>
            <span className={styles.unit}>{UNIT}</span>
            <p className={styles.c}>{C_PRE}<b ref={cnRef}>0</b>{C_POST}</p>
            <div className={styles.sky} ref={skyRef} role="img" aria-label={ARIA_SKY}>
              <canvas ref={scvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
