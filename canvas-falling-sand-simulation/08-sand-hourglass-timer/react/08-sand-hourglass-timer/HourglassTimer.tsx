// HourglassTimer — vanilla 판(run/318/demo/08-sand-hourglass-timer/index.html) 의 React 포트.
// 위 원뿔 + 아래 역원뿔 벽(목 폭 neck 칸)을 계단선으로 그려 두고 위칸을 모래로 가득 채우면,
// 기본 낙하 + 대각 미끄짐 규칙만으로 위가 비고 아래가 차는 모래시계 리듬이 나온다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HourglassTimer.module.scss";

export type HourglassTimerProps = {
  duration?: string;
  easing?: string;
  color?: string;
  neck?: number;     // 목 폭(칸)
  slideP?: number;   // 사면 대각 미끄짐 확률(0~1)
  cellPx?: number;   // 셀 크기(px)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Colors = { night: RGB; mist: RGB; ice: RGB; sandA: RGB; sandB: RGB; glow: RGB };

const FIELD_LABEL = "모래시계 셀 오토마타 데모";
const EMPTY = 0, SAND = 1, WALL = 3;

function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function HourglassTimer({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  neck = 3,
  slideP = 1.0,
  cellPx = 4,
}: HourglassTimerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const gridRef = useRef(new Uint8Array(0)) as Box<Uint8Array>;
  const dimRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const cellRef = useRef(cellPx) as Box<number>;
  const neckRef = useRef(neck) as Box<number>;
  const slideRef = useRef(slideP) as Box<number>;
  const randRef = useRef(makePRNG(0x318a08)) as Box<() => number>;
  const tickRef = useRef(0) as Box<number>;
  const cycleRef = useRef(0) as Box<number>;
  const lastMoveRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }

  function get(x: number, y: number): number {
    const { cols, rows } = dimRef.current;
    if (x < 0 || x >= cols || y < 0 || y >= rows) return WALL;
    return gridRef.current[y * cols + x];
  }
  function set(x: number, y: number, v: number): void {
    const { cols, rows } = dimRef.current;
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    gridRef.current[y * cols + x] = v;
  }

  function buildHourglass(): void {
    const { cols, rows } = dimRef.current;
    const cx = cols / 2;
    const neckHalf = neckRef.current / 2;
    const edgeMargin = Math.max(1, Math.round(cols * 0.04));
    const wideHalf = cols / 2 - edgeMargin;
    const neckBand = Math.max(2, Math.round(rows * 0.05));
    const mid = rows / 2;
    const leftWall = new Int16Array(rows);
    const rightWall = new Int16Array(rows);
    for (let y = 0; y < rows; y++) {
      let half: number;
      if (Math.abs(y - mid) <= neckBand) {
        half = neckHalf;
      } else if (y < mid) {
        const f = 1 - (mid - neckBand - y) / Math.max(1, mid - neckBand);
        half = neckHalf + (wideHalf - neckHalf) * Math.max(0, Math.min(1, 1 - f));
      } else {
        const f2 = (y - mid - neckBand) / Math.max(1, rows - 1 - mid - neckBand);
        half = neckHalf + (wideHalf - neckHalf) * Math.max(0, Math.min(1, f2));
      }
      leftWall[y] = Math.round(cx - half);
      rightWall[y] = Math.round(cx + half);
    }
    for (let y = 0; y < rows; y++) {
      set(leftWall[y], y, WALL);
      set(rightWall[y], y, WALL);
    }
    const fillBottom = Math.floor(mid - neckBand);
    for (let y = 0; y < fillBottom; y++) {
      for (let x = leftWall[y] + 1; x < rightWall[y]; x++) set(x, y, SAND);
    }
  }

  function moveInto(x: number, y: number, nx: number, ny: number): boolean {
    if (get(nx, ny) !== EMPTY) return false;
    set(x, y, EMPTY);
    set(nx, ny, SAND);
    return true;
  }

  function updateSand(x: number, y: number, dir: number): boolean {
    const rand = randRef.current;
    if (get(x, y) !== SAND) return false;
    if (moveInto(x, y, x, y + 1)) return true;
    if (rand() > slideRef.current) return false;
    const first = dir > 0 ? -1 : 1;
    if (moveInto(x, y, x + first, y + 1)) return true;
    return moveInto(x, y, x - first, y + 1);
  }

  function update(): void {
    const { cols, rows } = dimRef.current;
    tickRef.current++;
    cycleRef.current++;
    const dir = tickRef.current % 2 === 0 ? 1 : -1;
    let moved = false;
    for (let y = rows - 2; y >= 0; y--) {
      if (dir > 0) {
        for (let x = 0; x < cols; x++) { if (updateSand(x, y, dir)) moved = true; }
      } else {
        for (let x = cols - 1; x >= 0; x--) { if (updateSand(x, y, dir)) moved = true; }
      }
    }
    if (moved) lastMoveRef.current = tickRef.current;
    // 뒤집기 — 낙하가 멎은 뒤 잠깐 멈춤 보여주고 위칸을 다시 채운다(무한 타이머)
    if (!moved && tickRef.current - lastMoveRef.current > 12 && cycleRef.current > 40) {
      gridRef.current = new Uint8Array(cols * rows);
      buildHourglass();
      cycleRef.current = 0;
      lastMoveRef.current = tickRef.current;
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const CELL = cellRef.current;
    const { cols, rows } = dimRef.current;
    const wave = Math.sin(t * 0.00055) * 0.5 + 0.5;
    const cx = W * (0.5 + 0.3 * Math.sin(t * 0.00042));
    const cy = H * (0.5 + 0.3 * Math.cos(t * 0.00036));
    const maxD = Math.hypot(W, H) * 0.6;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxD);
    grad.addColorStop(0, rgba(col.glow, 0.10 + 0.05 * wave));
    grad.addColorStop(1, rgba(col.night, 0));
    ctx.fillStyle = rgba(col.night, 1);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const grid = gridRef.current;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const m = grid[y * cols + x];
        if (m === EMPTY) continue;
        const px = x * CELL, py = y * CELL;
        if (m === WALL) ctx.fillStyle = rgba(col.mist, 0.42);
        else ctx.fillStyle = rgba((x + y) % 3 === 0 ? col.sandA : col.sandB, 1);
        ctx.fillRect(px, py, CELL, CELL);
      }
    }
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = Math.max(1, Math.round(r.width));
    sizeRef.current.h = Math.max(1, Math.round(r.height));
    cv.width = sizeRef.current.w;
    cv.height = sizeRef.current.h;
    ctxRef.current = ctx;
    const CELL = cellRef.current;
    dimRef.current.cols = Math.max(1, Math.floor(sizeRef.current.w / CELL));
    dimRef.current.rows = Math.max(1, Math.floor(sizeRef.current.h / CELL));
    gridRef.current = new Uint8Array(dimRef.current.cols * dimRef.current.rows);
    buildHourglass();
  }

  let last = 0, acc = 0;
  const STEP = 1000 / 60;
  function frame(now: number): void {
    if (!last) last = now;
    acc += now - last;
    last = now;
    let guard = 0;
    while (acc >= STEP && guard < 6) { update(); acc -= STEP; guard++; }
    draw(now);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    cellRef.current = cellPx;
    neckRef.current = neck;
    slideRef.current = slideP;
    randRef.current = makePRNG(0x318a08);
    tickRef.current = 0;
    cycleRef.current = 0;
    lastMoveRef.current = 0;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      mist: tokRGB(root, "--sand-mist"),
      ice: tokRGB(root, "--sand-ice"),
      sandA: tokRGB(root, "--sand-grain"),
      sandB: tokRGB(root, "--sand-gold"),
      glow: tokRGB(root, "--sand-glow"),
    };
    fit();
    function onResize(): void { last = 0; acc = 0; fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let i = 0; i < 220; i++) update();
      draw(3600);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neck, slideP, cellPx]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>좁은 목을 통과해 위칸이 비고 아래칸이 찹니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{neck}</b>칸 목 폭 · 모래시계 낙하</span>
          <span className={styles.metaDim}>canvas · fillRect · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
