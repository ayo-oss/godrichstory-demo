// TetrisPortraitSkin — vanilla 판(run/330/demo/09-tetris-portrait-skin/index.html) 의 React 포트.
// 지금까지 여덟 단계를 전부 합친 완성판. 일곱 조각의 빛깔 배정은 스킨(세 가지 팔레트)으로
// 바꿀 수 있고, 최고점은 localStorage 에 남아 다음 방문에 이어진다.
// 보드·회전·충돌·클리어·점수(100×줄²)·고스트는 앞 단계의 코드가 그대로 돈다.
// 정렬 전 5칸/s · 정렬 후 34칸/s · 미끄러짐 13칸/s · 클리어 섬광 0.16초 · 벽 킥 0,±1,±2.
// 값·수치는 vanilla 와 같다. SHAPES 원본은 오염시키지 않는다 — 회전 판은 map(slice) 사본.
// 움직임은 전부 캔버스 rAF 루프가 그리므로 CSS 애니메이션이 없다.
// reduce 에서는 루프를 돌리지 않고 스킨·점수·고스트가 다 보이는 한 장만 남긴다(.isStill).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TetrisPortraitSkin.module.scss";

export type TetrisPortraitSkinProps = {
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
const BOX: Record<string, number> = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
const KICKS = [0, -1, 1, -2, 2];
const FLASH_S = 0.16;                          // 클리어 섬광 (초)
const FALL_ALIGNED = 34, DRIFT = 5, SLIDE = 13; // 정렬 후 34칸/s · 정렬 전 5칸/s · 미끄러짐 13칸/s

// 스킨 — 세 팔레트 (파스텔 기본 · 야간 · 모노). 값은 vanilla CSS 변수와 동일
type Skin = { fill: Record<string, string>; edge: Record<string, string>; line: string; flash: string };
const SKINS: Skin[] = [
  {
    fill: { I: "#a6ced3", O: "#d3c9a6", T: "#c6a6d3", S: "#a6d3b1", Z: "#d3a6aa", J: "#a6b4d3", L: "#d3baa6" },
    edge: { I: "#429da9", O: "#a99342", T: "#8a42a9", S: "#42a95b", Z: "#a9424a", J: "#4261a9", L: "#a97042" },
    line: "rgba(255,247,230,.08)", flash: "#ffd23f"
  },
  {
    fill: { I: "#2e4a4f", O: "#4f482e", T: "#472e4f", S: "#2e4f3a", Z: "#4f2e33", J: "#2e384f", L: "#4f3c2e" },
    edge: { I: "#8fd0da", O: "#dcc98f", T: "#d0a6df", S: "#98e0af", Z: "#e0a6ae", J: "#a6bae0", L: "#e0c0a6" },
    line: "rgba(255,247,230,.06)", flash: "#6ec8ff"
  },
  {
    fill: { I: "#b9c2cc", O: "#a3aeb9", T: "#cdd5dd", S: "#96a2ad", Z: "#b0bac5", J: "#8b97a3", L: "#c2cad3" },
    edge: { I: "#5d6a78", O: "#4d5a68", T: "#707d8b", S: "#414d5a", Z: "#57646f", J: "#38434f", L: "#67737f" },
    line: "rgba(255,247,230,.10)", flash: "#fff7e6"
  }
];
const SKIN_NAMES = ["파스텔", "야간", "모노"];

const HINT = "블록 퍼즐 완성판 — 스킨을 골라 보세요";
const ARIA_FIELD = "블록 퍼즐 완성판";
const ARIA_HIST = "최근 점수 흐름";
const L_SKIN = "스킨";
const L_SCORE = "점수";
const L_BEST = "최고점";
const GAMEOVER = "게임 끝";

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

export default function TetrisPortraitSkin({
  duration = "2s",
  easing = "ease-out",
  color = "#6ec8ff"
}: TetrisPortraitSkinProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const scoreRef = useRef<HTMLElement | null>(null);
  const bestRef = useRef<HTMLElement | null>(null);
  const histRef = useRef<HTMLDivElement | null>(null);
  const hcvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const hctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const stRef = useRef({
    W: 0, H: 0, HW: 0, HH: 0, dpr: 1, cell: 8, ox: 0, oy: 0,
    grid: [] as Grid, bag: [] as string[], piece: null as Piece | null,
    skinIdx: 0, score: 0, best: 0, over: false,
    flashRows: [] as number[], flashT: 0, scoreHistory: [] as number[]
  }) as Box<{
    W: number; H: number; HW: number; HH: number; dpr: number; cell: number; ox: number; oy: number;
    grid: Grid; bag: string[]; piece: Piece | null;
    skinIdx: number; score: number; best: number; over: boolean;
    flashRows: number[]; flashT: number; scoreHistory: number[];
  }>;
  const rndRef = useRef(mulberry32(3309)) as Box<() => number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [skinIdx, setSkinIdx] = useState(0);
  const [gameover, setGameover] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function skin(): Skin {
    return SKINS[stRef.current.skinIdx];
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

  // 점수·최고점 — localStorage (저장 실패는 무시)
  const BEST_KEY = "p330-09-best";
  const SKIN_KEY = "p330-09-skin";
  function saveBest(): void {
    const st = stRef.current;
    if (st.score > st.best) {
      st.best = st.score;
      const out = bestRef.current;
      if (out) out.textContent = String(st.best);
      try { localStorage.setItem(BEST_KEY, String(st.best)); } catch (e) { /* 무시 */ }
    }
  }
  function saveSkin(): void {
    try { localStorage.setItem(SKIN_KEY, String(stRef.current.skinIdx)); } catch (e) { /* 무시 */ }
  }

  function spawn(): void {
    const st = stRef.current;
    const t = nextType();
    const plan = choose(st.grid, t);
    if (!plan) { st.over = true; setGameover(true); return; }
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
    if (dead) { st.grid = emptyGrid(); st.piece = null; return; } // 판이 넘으면 리셋하고 계속 — 데모는 멈추지 않는다
    st.flashRows = [];
    for (let y = 0; y < ROWS; y++) {
      let n = 0;
      for (let x = 0; x < COLS; x++) if (st.grid[y][x]) n += 1;
      if (n === COLS) st.flashRows.push(y);
    }
    if (st.flashRows.length) {
      st.score += 100 * st.flashRows.length * st.flashRows.length;
      const out = scoreRef.current;
      if (out) out.textContent = String(st.score);
      st.scoreHistory.push(st.score);
      if (st.scoreHistory.length > 30) st.scoreHistory.shift();
      saveBest();
      st.flashT = FLASH_S;
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
    if (filled < COLS * 2) {
      for (let gy = ROWS - 3; gy < ROWS; gy++) {
        const h = Math.floor(rndRef.current() * COLS);
        for (let gx = 0; gx < COLS; gx++) st.grid[gy][gx] = gx === h ? "" : TYPES[Math.floor(rndRef.current() * 7)];
      }
    }
  }
  function restart(): void {
    const st = stRef.current;
    st.grid = emptyGrid();
    st.score = 0; st.over = false;
    const out = scoreRef.current;
    if (out) out.textContent = "0";
    setGameover(false);
    spawn();
  }

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  function fit(): void {
    const st = stRef.current;
    const field = fieldRef.current, cv = cvRef.current, hist = histRef.current, hcv = hcvRef.current;
    if (!field || !cv || !hist || !hcv) return;
    const ctx = cv.getContext("2d"), hctx = hcv.getContext("2d");
    if (!ctx || !hctx) return;
    st.W = field.clientWidth; st.H = field.clientHeight;
    st.HW = hist.clientWidth; st.HH = hist.clientHeight;
    st.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(st.W * st.dpr); cv.height = Math.round(st.H * st.dpr);
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    hcv.width = Math.round(st.HW * st.dpr); hcv.height = Math.round(st.HH * st.dpr);
    hctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.floor(Math.min(st.H / ROWS, st.W / COLS));
    st.ox = Math.floor((st.W - st.cell * COLS) / 2);
    st.oy = Math.floor((st.H - st.cell * ROWS) / 2);
    ctxRef.current = ctx;
    hctxRef.current = hctx;
  }

  function paintCell(gx: number, gy: number, t: string, alpha?: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sk = skin();
    const r = Math.max(2, st.cell * 0.22);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.beginPath();
    ctx.roundRect(st.ox + gx * st.cell + 1, st.oy + gy * st.cell + 1, st.cell - 2, st.cell - 2, r);
    ctx.fillStyle = sk.fill[t]; ctx.fill();
    ctx.lineWidth = Math.max(1, st.cell * 0.14);
    ctx.strokeStyle = sk.edge[t]; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function draw(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sk = skin();
    ctx.clearRect(0, 0, st.W, st.H);
    ctx.strokeStyle = sk.line; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x++) { ctx.moveTo(st.ox + x * st.cell + 0.5, st.oy); ctx.lineTo(st.ox + x * st.cell + 0.5, st.oy + ROWS * st.cell); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(st.ox, st.oy + y * st.cell + 0.5); ctx.lineTo(st.ox + COLS * st.cell, st.oy + y * st.cell + 0.5); }
    ctx.stroke();
    for (let gy = 0; gy < ROWS; gy++) for (let gx = 0; gx < COLS; gx++) if (st.grid[gy][gx]) paintCell(gx, gy, st.grid[gy][gx]);
    if (st.flashT > 0) {
      ctx.globalAlpha = Math.min(1, st.flashT / FLASH_S) * 0.85;
      ctx.fillStyle = sk.flash;
      for (let f = 0; f < st.flashRows.length; f++) ctx.fillRect(st.ox, st.oy + st.flashRows[f] * st.cell, st.cell * COLS, st.cell);
      ctx.globalAlpha = 1;
    }
    if (st.piece) {
      const p = st.piece;
      // 고스트 — 착지점 점선 윤곽
      const px = Math.round(p.x);
      const lr = landingRow(st.grid, p.cells, px);
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = sk.edge[p.t];
      for (let g = 0; g < p.cells.length; g++) {
        const gyy = lr + p.cells[g][1];
        if (gyy >= 0 && gyy !== Math.floor(p.y) + p.cells[g][1]) {
          ctx.beginPath();
          ctx.roundRect(st.ox + (px + p.cells[g][0]) * st.cell + 2.5, st.oy + gyy * st.cell + 2.5, st.cell - 5, st.cell - 5, Math.max(2, st.cell * 0.22));
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      for (let i = 0; i < p.cells.length; i++) {
        const cy = p.y + p.cells[i][1];
        if (cy >= 0) paintCell(px + p.cells[i][0], Math.round(cy), p.t);
      }
    }
  }
  function drawHist(): void {
    const st = stRef.current;
    const hctx = hctxRef.current;
    if (!hctx || !st.HW || !st.HH) return;
    hctx.clearRect(0, 0, st.HW, st.HH);
    if (st.scoreHistory.length < 2) return;
    const max = st.scoreHistory[st.scoreHistory.length - 1] || 1;
    const bw = st.HW / (st.scoreHistory.length - 1);
    hctx.beginPath();
    for (let i = 0; i < st.scoreHistory.length; i++) {
      const yy = st.HH - (st.scoreHistory[i] / max) * (st.HH - 2) - 1;
      if (i === 0) hctx.moveTo(0, yy); else hctx.lineTo(i * bw, yy);
    }
    hctx.strokeStyle = skin().flash;
    hctx.lineWidth = 2;
    hctx.stroke();
  }

  function step(now: number): void {
    const st = stRef.current;
    const dt = Math.min(64, now - lastRef.current) / 1000;
    lastRef.current = now;
    if (!st.over) {
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
          const px3 = Math.round(p.x);
          let k = 0;
          for (; k < KICKS.length && hits(st.grid, rc, Math.floor(p.y), px3 + KICKS[k]); k++) { /* 킥 탐색 */ }
          if (k < KICKS.length) { p.cells = rc; p.x = px3 + KICKS[k]; p.r = (p.r + 1) % 4; }
          else p.r = p.plan.r;
        }
        const target = landingRow(st.grid, p.cells, Math.round(p.x));
        const aligned = Math.abs(dx) < 0.05 && p.r === p.plan.r;
        const ny = p.y + (aligned ? FALL_ALIGNED : DRIFT) * dt;
        p.y = ny >= target ? target : ny;
        if (p.y === target) lock();
      }
    }
    draw();
    drawHist();
    rafRef.current = requestAnimationFrame(step);
  }

  // 누르면 — 끝났으면 다시 시작, 아니면 하드드롭
  function onPointerDown(): void {
    const st = stRef.current;
    if (st.over) { restart(); return; }
    if (st.piece) {
      const p = st.piece;
      p.x = p.plan.c;
      p.cells = shapeRot(p.t, p.plan.r);
      p.r = p.plan.r;
      p.y = landingRow(st.grid, p.cells, Math.round(p.x));
      lock();
      if (reduced()) { draw(); drawHist(); }
    } else if (reduced()) { draw(); drawHist(); }
  }
  // 스킨 버튼 — 팔레트를 바꾸고 선택을 저장한다
  function onSkin(idx: number): void {
    stRef.current.skinIdx = idx;
    setSkinIdx(idx);
    saveSkin();
    if (reduced()) { draw(); drawHist(); }
    else { draw(); drawHist(); }
  }

  useEffect(() => {
    const st = stRef.current;
    st.grid = emptyGrid();
    // 시작 쓰레기 — 아래 4줄, 줄마다 구멍 1칸
    for (let gy0 = ROWS - 4; gy0 < ROWS; gy0++) {
      const h0 = Math.floor(rndRef.current() * COLS);
      for (let gx0 = 0; gx0 < COLS; gx0++) st.grid[gy0][gx0] = gx0 === h0 ? "" : TYPES[Math.floor(rndRef.current() * 7)];
    }
    refill();
    // 저장된 최고점·스킨 불러오기
    try {
      st.best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
      const sv = parseInt(localStorage.getItem(SKIN_KEY) || "0", 10) || 0;
      if (sv >= 0 && sv < SKINS.length) st.skinIdx = sv;
    } catch (e) { /* 저장 실패는 무시 */ }
    const bestOut = bestRef.current;
    if (bestOut) bestOut.textContent = String(st.best);
    setSkinIdx(st.skinIdx);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) { draw(); drawHist(); }
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // 정지 한 장 — 스킨·점수·고스트가 다 보이는 상태
      st.score = 1900;
      const scOut = scoreRef.current;
      if (scOut) scOut.textContent = String(st.score);
      st.scoreHistory = [100, 500, 500, 1400, 1900];
      st.piece = { t: "L", r: 0, cells: SHAPES.L.slice(), x: 4, y: 4.0, plan: { r: 0, c: 4 } };
      draw(); drawHist();
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

  const rootCls = still ? styles.sk + " " + styles.isStill : styles.sk;
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
            <b className={styles.title}>{L_SKIN}</b>
            <div className={styles.skins}>
              {SKIN_NAMES.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  className={styles.skinBtn}
                  aria-pressed={i === skinIdx ? "true" : "false"}
                  onClick={function () { onSkin(i); }}
                >{name}</button>
              ))}
            </div>
            <div className={styles.stats}>
              <span className={styles.sLabel}>{L_SCORE}</span>
              <b className={styles.score} ref={scoreRef} aria-live="polite">0</b>
              <span className={styles.sLabel}>{L_BEST}</span>
              <b className={styles.best} ref={bestRef}>0</b>
            </div>
            <p className={gameover ? styles.gameover + " " + styles.isOn : styles.gameover}>{GAMEOVER}</p>
            <div className={styles.hist} ref={histRef} role="img" aria-label={ARIA_HIST}>
              <canvas ref={hcvRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
