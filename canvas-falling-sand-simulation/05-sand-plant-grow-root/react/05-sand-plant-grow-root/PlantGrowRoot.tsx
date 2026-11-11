// PlantGrowRoot — vanilla 판(run/318/demo/05-sand-plant-grow-root/index.html) 의 React 포트.
// 식물 성장 생성 규칙 — 씨앗/식물 칸의 아래·옆에 물이 닿으면 확률로 위 빈칸을 새 줄기로 바꾸고 물을 소모한다.
// 빗방울은 아래→대각→좌우 규칙으로 흘러 굽이치고, 그 길을 따라 풀이 자라는 정원이 만들어진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PlantGrowRoot.module.scss";

export type PlantGrowRootProps = {
  duration?: string;
  easing?: string;
  color?: string;
  growP?: number;    // 발아·성장 확률 — 변형 "발아 확률" 축(0.03 이끼 · 0.2 정글)
  rainP?: number;    // 상단 빗방울 스포너 확률(칸당·틱당)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Colors = {
  night: RGB; glow: RGB; water: RGB; plant: RGB; leaf: RGB;
  dirt: RGB; stone: RGB; mist: RGB;
};

const FIELD_LABEL = "식물 성장 셀 오토마타 데모";
const EMPTY = 0, WATER = 2, SEED = 8, PLANT = 9, DIRT = 10, STONE = 11;
const CELL = 4;
const STEP = 1000 / 60;

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 정원으로 자란다
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

export default function PlantGrowRoot({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  growP = 0.08,
  rainP = 0.05,
}: PlantGrowRootProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const growPRef = useRef(growP) as Box<number>;
  const rainPRef = useRef(rainP) as Box<number>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const wdirRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const dimsRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const tickRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makePRNG(0x318a55)) as Box<() => number>;
  const [n, setN] = useState(String(Math.round(growP * 100)));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--sand-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function idx(x: number, y: number): number {
    const { cols } = dimsRef.current;
    return y * cols + x;
  }

  // ── 장면 — 바닥 굴곡 흙 지형(사인 2개 합성) + 씨앗 8~10개 ──
  function build(): void {
    const { cols, rows } = dimsRef.current;
    const grid = new Uint8Array(cols * rows);
    const wdir = new Uint8Array(cols * rows);
    for (let x = 0; x < cols; x++) {
      // 굴곡 지형 — 낮은 물결 두 개를 합성. 아래는 돌, 위는 흙
      let hgt = rows * (0.72
        + 0.1 * Math.sin((x / cols) * Math.PI * 2.2 + 0.7)
        + 0.05 * Math.sin((x / cols) * Math.PI * 5.1 + 2.1));
      hgt = Math.round(Math.max(rows * 0.55, Math.min(rows * 0.88, hgt)));
      for (let y = hgt; y < rows; y++) grid[idx(x, y)] = y >= hgt + 2 ? STONE : DIRT;
    }
    // 씨앗 — 지형 표면 바로 위에 균등 간격
    const count = 9;
    for (let s = 0; s < count; s++) {
      const x = Math.round(cols * (0.08 + (0.84 * s) / (count - 1)));
      let y = 0;
      for (; y < rows; y++) {
        if (grid[idx(x, y)] !== EMPTY) break;
      }
      if (y > 0) grid[idx(x, y - 1)] = SEED;
    }
    gridRef.current = grid;
    wdirRef.current = wdir;
  }

  function update(): void {
    const grid = gridRef.current;
    const wdir = wdirRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    if (!grid || !wdir) return;
    tickRef.current++;
    const tick = tickRef.current;
    // 상단 빗방울 스포너 — 스포너 폭 전체, 확률 낮게
    for (let x = 0; x < cols; x++) {
      if (grid[idx(x, 0)] === EMPTY && rand() < rainPRef.current) grid[idx(x, 0)] = WATER;
    }
    const moved = new Uint8Array(cols * rows);
    // 아래 행 → 위 행 (물/성장 모두)
    for (let y = rows - 1; y >= 0; y--) {
      const ltr = (tick & 1) === 0;
      for (let s2 = 0; s2 < cols; s2++) {
        const x = ltr ? s2 : cols - 1 - s2;
        const i = idx(x, y);
        if (moved[i]) continue;
        const m = grid[i];
        if (m === WATER) {
          // 물 — 아래 → 대각 → 좌우(방향 교차). 고형(흙·돌·씨앗·식물) 위에만 멈춘다
          const below = y < rows - 1 ? grid[idx(x, y + 1)] : STONE;
          if (below === EMPTY) {
            grid[idx(x, y + 1)] = WATER; grid[i] = EMPTY; moved[idx(x, y + 1)] = 1;
          } else {
            const dir = wdir[i] || (tick & 1 ? 1 : -1);
            const dl = x > 0 && y < rows - 1 ? grid[idx(x - 1, y + 1)] : STONE;
            const dr = x < cols - 1 && y < rows - 1 ? grid[idx(x + 1, y + 1)] : STONE;
            const cand = dir > 0 ? [[1, dr], [-1, dl]] : [[-1, dl], [1, dr]];
            let done = false;
            for (let c = 0; c < 2 && !done; c++) {
              if (cand[c][1] === EMPTY) {
                const nx = x + cand[c][0];
                grid[idx(nx, y + 1)] = WATER; wdir[idx(nx, y + 1)] = cand[c][0];
                grid[i] = EMPTY; wdir[i] = 0; moved[idx(nx, y + 1)] = 1;
                done = true;
              }
            }
            if (!done) {
              const sx = x + dir;
              if (sx >= 0 && sx < cols && grid[idx(sx, y)] === EMPTY) {
                grid[idx(sx, y)] = WATER; wdir[idx(sx, y)] = dir;
                grid[i] = EMPTY; wdir[i] = 0; moved[idx(sx, y)] = 1;
              } else if (rand() < 0.06) {
                // 갇힌 물 — 증발. 흙 표면에 고여만 있는 정체를 막는다
                grid[i] = EMPTY;
              }
            }
          }
        } else if (m === SEED || m === PLANT) {
          // 성장 — 아래·옆에 물이 닿으면 확률로 위 빈칸을 줄기로, 물 소모
          const touch = [
            [0, 1, y < rows - 1 ? grid[idx(x, y + 1)] : STONE],
            [1, 0, x < cols - 1 ? grid[idx(x + 1, y)] : STONE],
            [-1, 0, x > 0 ? grid[idx(x - 1, y)] : STONE],
          ];
          for (let t2 = 0; t2 < 3; t2++) {
            if (touch[t2][2] !== WATER) continue;
            const wx = x + touch[t2][0], wy = y + touch[t2][1];
            if (y > 0 && grid[idx(x, y - 1)] === EMPTY && rand() < growPRef.current) {
              grid[idx(x, y - 1)] = PLANT;      // 새 줄기 — plant/leaf 교대 색은 렌더에서 줄 번호로
              grid[idx(wx, wy)] = EMPTY;         // 물 소모
              moved[idx(x, y - 1)] = 1;
            }
            break; // 물 한 방울은 한 번만 쓴다
          }
        }
      }
    }
  }

  // ── 렌더 — fillRect. 칸 = CELL px ──
  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const grid = gridRef.current;
    const { w: W, h: H } = sizeRef.current;
    const { cols, rows } = dimsRef.current;
    if (!ctx || !col || !grid) return;
    ctx.fillStyle = `rgb(${col.night.join(",")})`;
    ctx.fillRect(0, 0, W, H);

    // 잔광(안개) — 중심이 sin/cos 로 천천히 도는 radial gradient, 알파 낮게
    const gx = W * (0.5 + 0.3 * Math.sin(t * 0.8));
    const gy = H * (0.45 + 0.26 * Math.cos(t * 0.6));
    const gr = Math.max(W, H) * 0.55;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${col.glow.join(",")},0.06)`);
    g.addColorStop(1, `rgba(${col.glow.join(",")},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 격자 — 재료별 fillRect. 식물은 세로 줄 번호 홀짝으로 plant/leaf 교대
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const m = grid[idx(x, y)];
        if (m === EMPTY) continue;
        if (m === WATER) ctx.fillStyle = `rgb(${col.water.join(",")})`;
        else if (m === SEED) ctx.fillStyle = `rgb(${col.mist.join(",")})`;
        else if (m === PLANT) {
          // 바람 — 자란 줄기가 매 프레임 살짝 흔들린다(위쪽 칸일수록 크게)
          const sway = Math.sin(t * 2.1 + x * 0.55 + y * 0.21) * (2 + (rows - y) * 0.9);
          const base = y & 1 ? col.plant : col.leaf;
          ctx.fillStyle = `rgb(${Math.round(base[0] - sway)},${Math.round(base[1] - sway * 0.8)},${Math.round(base[2] - sway * 0.6)})`;
        }
        else if (m === DIRT) ctx.fillStyle = `rgb(${col.dirt.join(",")})`;
        else if (m === STONE) ctx.fillStyle = `rgb(${col.stone.join(",")})`;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
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
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctxRef.current = ctx;
    dimsRef.current.cols = Math.max(8, Math.floor(r.width / CELL));
    dimsRef.current.rows = Math.max(8, Math.floor(r.height / CELL));
    build();
    tickRef.current = 0;
  }

  function stillFrame(): void {
    // reduce — 비 몇 방울 + 성장 몇 틱만 돌리고 한 장
    for (let k = 0; k < 90; k++) update();
    draw(0.5);
  }

  let t0 = -1;
  let prev = 0;
  let acc = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    acc += now - (prev || now);
    prev = now;
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    growPRef.current = growP;
    rainPRef.current = rainP;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      water: tokRGB(root, "--sand-water"),
      plant: tokRGB(root, "--sand-plant"),
      leaf: tokRGB(root, "--sand-leaf"),
      dirt: tokRGB(root, "--sand-grain"),
      stone: tokRGB(root, "--sand-stone"),
      mist: tokRGB(root, "--sand-mist"),
    };
    randRef.current = makePRNG(0x318a55);
    fit();
    setN(String(Math.round(growP * 100)));
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
  }, [growP, rainP]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>물이 씨앗을 스치면 줄기가 위로 자랍니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>발아 확률 %</span>
          <span className={styles.metaDim}>canvas · fillRect · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
