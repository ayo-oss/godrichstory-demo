// PointerBrushPour — vanilla 판(run/318/demo/06-sand-pointer-brush-pour/index.html) 의 React 포트.
// 포인터 브러시 스포너 — pointermove 로 커서 좌표 주변 반경의 빈칸에 확률로 선택 재료를 충전한다.
// 커서가 없을 때는 리사주 곡선 경로로 붓이 스스로 움직이며 모래→물→씨앗을 순환한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PointerBrushPour.module.scss";

export type PointerBrushPourProps = {
  duration?: string;
  easing?: string;
  color?: string;
  brushR?: number;   // 브러시 반경(칸) — 변형 "브러시 반경" 축(3 가는 펜 · 12 넓은 붓)
  pourP?: number;    // 반경 안 빈칸의 충전 확률
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Colors = {
  night: RGB; glow: RGB; sand: RGB; gold: RGB; water: RGB; mist: RGB; stone: RGB;
};

const FIELD_LABEL = "포인터 브러시 낙하 셀 오토마타 데모";
const EMPTY = 0, SAND = 1, WATER = 2, SEED = 8, STONE = 11;
const CELL = 4;
const STEP = 1000 / 60;
const CYCLE = 40;
const MATS = [SAND, WATER, SEED];
const LILAC: RGB = [185, 160, 255];

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 붓길로 흐른다
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

export default function PointerBrushPour({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  brushR = 6,
  pourP = 0.5,
}: PointerBrushPourProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const brushRRef = useRef(brushR) as Box<number>;
  const pourPRef = useRef(pourP) as Box<number>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const wdirRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const dimsRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const tickRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makePRNG(0x318a66)) as Box<() => number>;
  const brushRef = useRef({ x: 0, y: 0, gx: 0, gy: 0, hasPointer: false }) as Box<{
    x: number; y: number; gx: number; gy: number; hasPointer: boolean;
  }>;
  const [n, setN] = useState(String(brushR));
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

  // ── 장면 — 바닥 돌 지형(완만한 언덕 + 우측 낮은 곳) ──
  function build(): void {
    const { cols, rows } = dimsRef.current;
    const grid = new Uint8Array(cols * rows);
    const wdir = new Uint8Array(cols * rows);
    for (let x = 0; x < cols; x++) {
      let hgt = rows * (0.82
        + 0.07 * Math.sin((x / cols) * Math.PI * 1.7 + 0.4)
        - 0.1 * Math.sin((x / cols) * Math.PI * 0.9));
      hgt = Math.round(Math.max(rows * 0.62, Math.min(rows * 0.92, hgt)));
      for (let y = hgt; y < rows; y++) grid[idx(x, y)] = STONE;
    }
    gridRef.current = grid;
    wdirRef.current = wdir;
  }

  // ── 붓 — 반경 안 빈칸에 확률 충전 ──
  function pour(gx: number, gy: number, mat: number): void {
    const grid = gridRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    const R = brushRRef.current;
    if (!grid) return;
    const r2 = R * R;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = gx + dx, y = gy + dy;
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const i = idx(x, y);
        if (grid[i] === EMPTY && rand() < pourPRef.current) grid[i] = mat;
      }
    }
  }

  // 리사주 곡선 — 서로 다른 주파수의 sin/cos 로 붓이 화면을 끊임없이 가로지른다
  function lissajous(t: number): { x: number; y: number } {
    const { w: W, h: H } = sizeRef.current;
    const u = t * 1.6;
    return {
      x: W * (0.5 + 0.44 * Math.sin(u * 1.7 + 1.2)),
      y: H * (0.45 + 0.36 * Math.sin(u * 2.6)),
    };
  }

  function update(t: number): void {
    const grid = gridRef.current;
    const wdir = wdirRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    const brush = brushRef.current;
    if (!grid || !wdir) return;
    tickRef.current++;
    const tick = tickRef.current;
    if (!brush.hasPointer) {
      const p = lissajous(t);
      brush.x = p.x; brush.y = p.y;
      brush.gx = Math.floor(brush.x / CELL);
      brush.gy = Math.floor(brush.y / CELL);
    }
    pour(brush.gx, brush.gy, MATS[Math.floor(tick / CYCLE) % 3]);

    const moved = new Uint8Array(cols * rows);
    for (let y = rows - 1; y >= 0; y--) {
      const ltr = (tick & 1) === 0;
      for (let s = 0; s < cols; s++) {
        const x = ltr ? s : cols - 1 - s;
        const i = idx(x, y);
        if (moved[i]) continue;
        const m = grid[i];
        if (m === SAND) {
          // 모래 — 아래, 막히면 대각(02 규칙)
          if (y < rows - 1 && grid[idx(x, y + 1)] === EMPTY) {
            grid[idx(x, y + 1)] = SAND; grid[i] = EMPTY; moved[idx(x, y + 1)] = 1;
          } else {
            const dirs = rand() < 0.5 ? [-1, 1] : [1, -1];
            for (let d = 0; d < 2; d++) {
              const nx = x + dirs[d];
              if (nx < 0 || nx >= cols || y >= rows - 1) continue;
              if (grid[idx(nx, y + 1)] === EMPTY) {
                grid[idx(nx, y + 1)] = SAND; grid[i] = EMPTY; moved[idx(nx, y + 1)] = 1;
                break;
              }
            }
          }
        } else if (m === WATER) {
          // 물 — 아래 → 대각 → 좌우(방향 교차)
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
                const cx = x + cand[c][0];
                grid[idx(cx, y + 1)] = WATER; wdir[idx(cx, y + 1)] = cand[c][0];
                grid[i] = EMPTY; wdir[i] = 0; moved[idx(cx, y + 1)] = 1;
                done = true;
              }
            }
            if (!done) {
              const sx = x + dir;
              if (sx >= 0 && sx < cols && grid[idx(sx, y)] === EMPTY) {
                grid[idx(sx, y)] = WATER; wdir[idx(sx, y)] = dir;
                grid[i] = EMPTY; wdir[i] = 0; moved[idx(sx, y)] = 1;
              } else if (rand() < 0.02) {
                grid[i] = EMPTY; // 갇힌 물 증발 — 화면이 포화되지 않게
              }
            }
          }
        }
        // 씨앗은 정지 — 붓자국이 그대로 남는다
      }
    }
  }

  // ── 렌더 — fillRect. 칸 = CELL px ──
  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const grid = gridRef.current;
    const brush = brushRef.current;
    const { w: W, h: H } = sizeRef.current;
    const { cols, rows } = dimsRef.current;
    if (!ctx || !col || !grid) return;
    ctx.fillStyle = `rgb(${col.night.join(",")})`;
    ctx.fillRect(0, 0, W, H);

    // 잔광(안개) — 중심이 sin/cos 로 천천히 도는 radial gradient, 알파 낮게
    const gx = W * (0.5 + 0.3 * Math.sin(t * 0.9 + 2.0));
    const gy = H * (0.5 + 0.26 * Math.cos(t * 0.7));
    const gr = Math.max(W, H) * 0.55;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${col.glow.join(",")},0.06)`);
    g.addColorStop(1, `rgba(${col.glow.join(",")},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 격자 — 재료별 fillRect. 모래는 매 프레임 위상이 도는 grain/gold 교대로 알갱이가 반짝인다
    const ph = Math.floor(t * 30) % 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const m = grid[idx(x, y)];
        if (m === EMPTY) continue;
        if (m === SAND) ctx.fillStyle = ((x + y) & 1) === ph ? `rgb(${col.sand.join(",")})` : `rgb(${col.gold.join(",")})`;
        else if (m === WATER) ctx.fillStyle = `rgb(${col.water.join(",")})`;
        else if (m === SEED) ctx.fillStyle = `rgb(${col.mist.join(",")})`;
        else if (m === STONE) ctx.fillStyle = `rgb(${col.stone.join(",")})`;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // 붓 링 — 반경을 옅은 라일락 고리로 보여 붓의 크기를 알린다
    const pr = brushRRef.current * CELL;
    ctx.beginPath();
    ctx.arc(brush.x, brush.y, pr, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${LILAC.join(",")},0.35)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
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
    const p = lissajous(0);
    brushRef.current.x = p.x; brushRef.current.y = p.y;
    brushRef.current.gx = Math.floor(p.x / CELL);
    brushRef.current.gy = Math.floor(p.y / CELL);
  }

  // pointermove — field 좌표 → 격자 좌표 변환해 붓 위치 갱신. 커서가 있으면 자동 붓은 쉰다
  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const brush = brushRef.current;
    brush.x = e.clientX - r.left;
    brush.y = e.clientY - r.top;
    const { cols, rows } = dimsRef.current;
    brush.gx = Math.max(0, Math.min(cols - 1, Math.floor(brush.x / CELL)));
    brush.gy = Math.max(0, Math.min(rows - 1, Math.floor(brush.y / CELL)));
    brush.hasPointer = true;
  }
  function onPointerLeave(): void {
    brushRef.current.hasPointer = false;
  }

  function stillFrame(): void {
    // reduce — 자동 붓 몇 보 + 낙하 몇 틱만 돌리고 한 장
    for (let k = 0; k < 50; k++) update(k / 60);
    draw(0.8);
  }

  let t0 = -1;
  let prev = 0;
  let acc = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    acc += now - (prev || now);
    prev = now;
    while (acc >= STEP) {
      update(t);
      acc -= STEP;
    }
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    brushRRef.current = brushR;
    pourPRef.current = pourP;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      sand: tokRGB(root, "--sand-grain"),
      gold: tokRGB(root, "--sand-gold"),
      water: tokRGB(root, "--sand-water"),
      mist: tokRGB(root, "--sand-mist"),
      stone: tokRGB(root, "--sand-stone"),
    };
    randRef.current = makePRNG(0x318a66);
    brushRef.current = { x: 0, y: 0, gx: 0, gy: 0, hasPointer: false };
    fit();
    setN(String(brushR));
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
  }, [brushR, pourP]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>커서(또는 자동 붓)가 지나간 자리에 재료가 쏟아집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>브러시 반경 칸</span>
          <span className={styles.metaDim}>canvas · fillRect · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
