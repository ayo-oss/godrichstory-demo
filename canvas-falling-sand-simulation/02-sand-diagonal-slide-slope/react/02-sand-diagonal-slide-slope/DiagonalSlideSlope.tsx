// DiagonalSlideSlope — vanilla 판(run/318/demo/02-sand-diagonal-slide-slope/index.html) 의 React 포트.
// 사면 미끄짐 — 낙하 규칙에 좌하→우하 대각선 시도(SLIDE_P 확률)를 얹어 안식각 원뿔을 만든다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DiagonalSlideSlope.module.scss";

export type DiagonalSlideSlopeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  slideP?: number;    // 대각 시도 확률 — 변형 "대각 시도" 축(1.0 완만 · 0.4 뾰족)
  spawnP?: number;    // 스포너 칸별 매 틱 생성 확률
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "모래 사면 미끄짐 셀 오토마타 데모";
const CELL = 4;
const STEP = 1 / 60;
const ZONE_W = 4;

// 시드 고정 PRNG — mulberry32
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

export default function DiagonalSlideSlope({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  slideP = 1.0,
  spawnP = 0.42,
}: DiagonalSlideSlopeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, cols: 0, rows: 0 }) as Box<{ w: number; h: number; cols: number; rows: number }>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const shadeRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const zoneRef = useRef(0) as Box<number>;
  const colRef = useRef<{ night: RGB; glow: RGB; grain: RGB; gold: RGB } | null>(null);
  const slideRef = useRef(slideP) as Box<number>;
  const spawnRef = useRef(spawnP) as Box<number>;
  const randRef = useRef(makePRNG(0x318a02)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(Math.round(slideP * 100)));
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

  function idx(x: number, y: number): number { return y * sizeRef.current.cols + x; }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    const cols = Math.max(1, Math.floor(r.width / CELL));
    const rows = Math.max(1, Math.floor(r.height / CELL));
    sizeRef.current = { w: r.width, h: r.height, cols, rows };
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    gridRef.current = new Uint8Array(cols * rows);
    shadeRef.current = new Uint8Array(cols * rows);
    zoneRef.current = Math.max(0, Math.round(cols / 2 - ZONE_W / 2));
    ctxRef.current = ctx;
  }

  function spawnStep(): void {
    const { cols } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    const rand = randRef.current;
    for (let k = 0; k < ZONE_W; k++) {
      const x = zoneRef.current + k;
      if (x < 0 || x >= cols) continue;
      if (rand() < spawnRef.current) {
        const i = idx(x, 0);
        if (grid[i] === 0) { grid[i] = 1; shade[i] = rand() < 0.5 ? 0 : 1; }
      }
    }
  }

  function update(): void {
    const { cols, rows } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    const rand = randRef.current;
    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        if (grid[i] !== 1) continue;
        // 1) 아래로
        const bi = idx(x, y + 1);
        if (grid[bi] === 0) {
          grid[bi] = 1; shade[bi] = shade[i]; grid[i] = 0;
          continue;
        }
        // 2) 대각선 — 좌하 → 우하 순서, SLIDE_P 확률
        if (rand() < slideRef.current) {
          const dir = rand() < 0.5 ? -1 : 1;
          let ok1 = false, ok2 = false;
          let nx = x + dir;
          if (nx >= 0 && nx < cols && grid[idx(nx, y + 1)] === 0 && grid[idx(nx, y)] === 0) ok1 = true;
          if (!ok1) {
            nx = x - dir;
            if (nx >= 0 && nx < cols && grid[idx(nx, y + 1)] === 0 && grid[idx(nx, y)] === 0) ok2 = true;
          }
          if (ok1 || ok2) {
            const dx = ok1 ? dir : -dir;
            const di = idx(x + dx, y + 1);
            grid[di] = 1; shade[di] = shade[i]; grid[i] = 0;
          }
        }
      }
    }
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H, cols, rows } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    ctx.fillStyle = `rgb(${col.night.join(",")})`;
    ctx.fillRect(0, 0, W, H);

    const gx = W * (0.5 + 0.36 * Math.sin(t * 0.17));
    const gy = H * (0.5 + 0.3 * Math.cos(t * 0.13));
    const gr = Math.max(W, H) * 0.7;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${col.glow.join(",")},0.07)`);
    g.addColorStop(1, `rgba(${col.glow.join(",")},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        if (grid[i] !== 1) continue;
        ctx.fillStyle = shade[i] ? `rgb(${col.gold.join(",")})` : `rgb(${col.grain.join(",")})`;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }
  }

  function stillFrame(): void {
    for (let k = 0; k < 40; k++) { spawnStep(); update(); }
    draw(0.6);
  }

  let t0 = -1;
  let prev = 0;
  let acc = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    acc += dt;
    while (acc >= STEP) { spawnStep(); update(); acc -= STEP; }
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    slideRef.current = slideP;
    spawnRef.current = spawnP;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      grain: tokRGB(root, "--sand-grain"),
      gold: tokRGB(root, "--sand-gold"),
    };
    randRef.current = makePRNG(0x318a02);
    fit();
    setN(String(Math.round(slideP * 100)));
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideP, spawnP]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>대각선 시도가 모래를 옆으로 퍼지게 해 안식각을 만듭니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>% 대각 시도 100%</span>
          <span className={styles.metaDim}>canvas · fillRect · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
