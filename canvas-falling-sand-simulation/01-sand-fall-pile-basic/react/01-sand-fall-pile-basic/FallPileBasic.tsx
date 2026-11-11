// FallPileBasic — vanilla 판(run/318/demo/01-sand-fall-pile-basic/index.html) 의 React 포트.
// 기본 낙하 — 아래칸이 비었으면 스왑하는 규칙 하나. 대각선 없음.
// 상단 세 스포너(좌·중·우)에서 모래(grain/gold)가 흘러 세로 기둥이 쌓인다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FallPileBasic.module.scss";

export type FallPileBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  fall?: number;       // 낙하 칸수/프레임 — 변형 "낙하 속도" 축(1 기본 · 3 빠른 폭포)
  spawnP?: number;     // 스포너 칸별 매 틱 생성 확률
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "모래 낙하 셀 오토마타 데모";
const CELL = 4;
const STEP = 1 / 60;
const ZONE_W = 10;

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

export default function FallPileBasic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  fall = 1,
  spawnP = 0.3,
}: FallPileBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, cols: 0, rows: 0 }) as Box<{ w: number; h: number; cols: number; rows: number }>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const shadeRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const zonesRef = useRef<number[]>([]) as Box<number[]>;
  const colRef = useRef<{ night: RGB; glow: RGB; grain: RGB; gold: RGB } | null>(null);
  const fallRef = useRef(fall) as Box<number>;
  const spawnRef = useRef(spawnP) as Box<number>;
  const randRef = useRef(makePRNG(0x318a01)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(fall));
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
    zonesRef.current = [
      Math.max(0, Math.round(cols * 0.06)),
      Math.max(0, Math.round(cols / 2 - ZONE_W / 2)),
      Math.max(0, Math.round(cols * 0.94 - ZONE_W)),
    ];
    ctxRef.current = ctx;
  }

  function spawnStep(): void {
    const { cols } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    const rand = randRef.current;
    const zones = zonesRef.current;
    for (let z = 0; z < zones.length; z++) {
      for (let k = 0; k < ZONE_W; k++) {
        const x = zones[z] + k;
        if (x < 0 || x >= cols) continue;
        if (rand() < spawnRef.current) {
          const i = idx(x, 0);
          if (grid[i] === 0) { grid[i] = 1; shade[i] = rand() < 0.5 ? 0 : 1; }
        }
      }
    }
  }

  function update(): void {
    const { cols, rows } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        if (grid[i] !== 1) continue;
        let destY = y;
        for (let s = 1; s <= fallRef.current; s++) {
          const yy = y + s;
          if (yy >= rows) break;
          if (grid[idx(x, yy)] === 0) destY = yy; else break;
        }
        if (destY !== y) {
          const di = idx(x, destY);
          grid[di] = 1; shade[di] = shade[i];
          grid[i] = 0;
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

    // 느린 잔광 — 중심이 sin/cos 로 천천히 도는 radial gradient(안개)
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
    fallRef.current = fall;
    spawnRef.current = spawnP;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      grain: tokRGB(root, "--sand-grain"),
      gold: tokRGB(root, "--sand-gold"),
    };
    randRef.current = makePRNG(0x318a01);
    fit();
    setN(String(fall));
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
  }, [fall, spawnP]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>위에서 쏟아진 모래가 아래칸이 비었을 때만 내려갑니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>칸 낙하 1칸/프레임</span>
          <span className={styles.metaDim}>canvas · fillRect · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
