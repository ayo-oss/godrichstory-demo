// AcidDissolve — vanilla 판(run/318/demo/07-sand-acid-dissolve-react/index.html) 의 React 포트.
// 산 칸이 아래·양옆 이웃을 지우고(부식) 확률로 자신도 소모되며, 물처럼 아래→대각→좌우로 이동한다.
// 계단형 흙·돌 선반 위 얇은 모래층을 상단 좌·우 스포너의 산이 뚫고 지하 통로를 파는 장면.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AcidDissolve.module.scss";

export type AcidDissolveProps = {
  duration?: string;
  easing?: string;
  color?: string;
  eatP?: number;        // 부식 성공 시 산이 소모될 확률(0~1)
  spawnEvery?: number;  // 산 스포너 간격(틱)
  cellPx?: number;      // 셀 크기(px)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Colors = {
  night: RGB; dirt: RGB; stone: RGB; sandA: RGB; sandB: RGB;
  acidA: RGB; acidB: RGB; mist: RGB;
};

const FIELD_LABEL = "산 부식 셀 오토마타 데모";
const EMPTY = 0, SAND = 1, DIRT = 10, STONE = 11, ACID = 12;

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

export default function AcidDissolve({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  eatP = 0.3,
  spawnEvery = 7,
  cellPx = 4,
}: AcidDissolveProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const gridRef = useRef(new Uint8Array(0)) as Box<Uint8Array>;
  const dimRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const cellRef = useRef(cellPx) as Box<number>;
  const eatRef = useRef(eatP) as Box<number>;
  const spawnRef = useRef(spawnEvery) as Box<number>;
  const randRef = useRef(makePRNG(0x318a07)) as Box<() => number>;
  const tickRef = useRef(0) as Box<number>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
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

  function get(x: number, y: number): number {
    const { cols, rows } = dimRef.current;
    if (x < 0 || x >= cols || y < 0 || y >= rows) return STONE;
    return gridRef.current[y * cols + x];
  }
  function set(x: number, y: number, v: number): void {
    const { cols, rows } = dimRef.current;
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    gridRef.current[y * cols + x] = v;
  }

  function buildTerrain(): void {
    const rand = randRef.current;
    const { cols, rows } = dimRef.current;
    const seg = Math.max(1, Math.floor(cols / 4));
    for (let x = 0; x < cols; x++) {
      const tier = Math.min(3, Math.floor(x / seg));
      const top = Math.floor(rows * (0.32 + tier * 0.15));
      for (let y = top; y < rows; y++) {
        const depth = y - top;
        set(x, y, depth < 2 ? DIRT : STONE);
      }
      const sandDepth = 1 + (rand() < 0.4 ? 1 : 0);
      for (let sy = 0; sy < sandDepth; sy++) {
        const ty = top - 1 - sy;
        if (ty >= 0) set(x, ty, SAND);
      }
    }
  }

  function isErodible(m: number): boolean { return m === DIRT || m === STONE || m === SAND; }

  function moveInto(x: number, y: number, nx: number, ny: number, m: number): boolean {
    if (get(nx, ny) !== EMPTY) return false;
    set(x, y, EMPTY);
    set(nx, ny, m);
    return true;
  }

  function updateAcid(x: number, y: number, dir: number): void {
    const rand = randRef.current;
    const spots: [number, number][] = [[x, y + 1], [x - 1, y], [x + 1, y]];
    let melted = false;
    for (let i = 0; i < spots.length; i++) {
      if (isErodible(get(spots[i][0], spots[i][1]))) { set(spots[i][0], spots[i][1], EMPTY); melted = true; }
    }
    if (melted && rand() < eatRef.current) { set(x, y, EMPTY); return; }
    if (moveInto(x, y, x, y + 1, ACID)) return;
    const first = dir > 0 ? -1 : 1;
    if (moveInto(x, y, x + first, y + 1, ACID)) return;
    if (moveInto(x, y, x - first, y + 1, ACID)) return;
    if (moveInto(x, y, x + first, y, ACID)) return;
    moveInto(x, y, x - first, y, ACID);
  }

  function updateSand(x: number, y: number, dir: number): void {
    if (moveInto(x, y, x, y + 1, SAND)) return;
    const first = dir > 0 ? -1 : 1;
    if (moveInto(x, y, x + first, y + 1, SAND)) return;
    moveInto(x, y, x - first, y + 1, SAND);
  }

  function update(): void {
    const rand = randRef.current;
    const { cols, rows } = dimRef.current;
    tickRef.current++;
    const tick = tickRef.current;
    if (tick % spawnRef.current === 0) {
      const leftX = 1 + Math.floor(rand() * 3);
      const rightX = cols - 2 - Math.floor(rand() * 3);
      if (get(leftX, 0) === EMPTY) set(leftX, 0, ACID);
      if (get(rightX, 0) === EMPTY) set(rightX, 0, ACID);
    }
    const dir = tick % 2 === 0 ? 1 : -1;
    for (let y = rows - 1; y >= 0; y--) {
      if (dir > 0) {
        for (let x = 0; x < cols; x++) {
          const m = get(x, y);
          if (m === ACID) updateAcid(x, y, dir);
          else if (m === SAND) updateSand(x, y, dir);
        }
      } else {
        for (let x = cols - 1; x >= 0; x--) {
          const m = get(x, y);
          if (m === ACID) updateAcid(x, y, dir);
          else if (m === SAND) updateSand(x, y, dir);
        }
      }
    }
  }

  function shade(c: RGB, amt: number): RGB {
    return [
      Math.max(0, Math.min(255, c[0] + amt)),
      Math.max(0, Math.min(255, c[1] + amt)),
      Math.max(0, Math.min(255, c[2] + amt)),
    ];
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const CELL = cellRef.current;
    const { cols, rows } = dimRef.current;
    let img = imgRef.current;
    if (!img || img.width !== W || img.height !== H) {
      img = ctx.createImageData(W, H);
      imgRef.current = img;
    }
    const buf = img.data;
    const grid = gridRef.current;
    const wave = Math.sin(t * 0.00055) * 0.5 + 0.5;
    const cx = W * (0.5 + 0.34 * Math.sin(t * 0.00042));
    const cy = H * (0.5 + 0.34 * Math.cos(t * 0.00036));
    const maxD = Math.hypot(W, H) * 0.6;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const m = grid[y * cols + x];
        const px0 = x * CELL, py0 = y * CELL;
        const d = Math.hypot(px0 - cx, py0 - cy) / maxD;
        const glow = Math.max(0, 1 - d) * (0.08 + 0.05 * wave);
        let c: RGB;
        if (m === EMPTY) {
          c = shade(col.night, Math.round(glow * 40));
        } else if (m === DIRT) {
          c = shade(col.dirt, ((x * 7 + y * 13) % 5) - 2 + Math.round(glow * 14));
        } else if (m === STONE) {
          c = shade(col.stone, ((x * 11 + y * 5) % 5) - 2 + Math.round(glow * 10));
        } else if (m === SAND) {
          c = ((x + y) % 3 === 0)
            ? shade(col.sandA, Math.round(glow * 18))
            : shade(col.sandB, Math.round(glow * 18));
        } else {
          const flick = Math.sin(t * 0.02 + x * 0.7 + y * 0.5) * 0.5 + 0.5;
          c = shade(flick > 0.5 ? col.acidB : col.acidA, Math.round(glow * 20));
        }
        for (let cyi = 0; cyi < CELL; cyi++) {
          const rowOff = ((py0 + cyi) * W + px0) * 4;
          for (let cxi = 0; cxi < CELL; cxi++) {
            const o = rowOff + cxi * 4;
            buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
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
    imgRef.current = null;
    buildTerrain();
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
    eatRef.current = eatP;
    spawnRef.current = spawnEvery;
    randRef.current = makePRNG(0x318a07);
    tickRef.current = 0;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      dirt: tokRGB(root, "--sand-wood"),
      stone: tokRGB(root, "--sand-stone"),
      sandA: tokRGB(root, "--sand-grain"),
      sandB: tokRGB(root, "--sand-gold"),
      acidA: tokRGB(root, "--sand-acid"),
      acidB: tokRGB(root, "--sand-glow"),
      mist: tokRGB(root, "--sand-mist"),
    };
    fit();
    function onResize(): void { last = 0; acc = 0; fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let i = 0; i < 90; i++) update();
      draw(1500);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eatP, spawnEvery, cellPx]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>산이 흙과 돌을 지우며 통로를 팝니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{Math.round(eatP * 100)}</b>% 부식 확률 · 산-흙-돌 반응</span>
          <span className={styles.metaDim}>canvas · ImageData putImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
