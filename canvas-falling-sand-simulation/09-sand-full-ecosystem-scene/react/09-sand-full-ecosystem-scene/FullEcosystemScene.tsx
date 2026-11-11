// FullEcosystemScene — vanilla 판(run/318/demo/09-sand-full-ecosystem-scene/index.html) 의 React 포트.
// 흙·돌 분지 지형 + 호수 + 풀, 상단 빗물 드리즐, 주기적 번개 점화 — 물·불·성장 규칙이 한 격자에서 순환한다.
// 재료: 모래·물·나무·불·재·연기·씨앗·식물·흙·돌.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FullEcosystemScene.module.scss";

export type FullEcosystemSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  rainP?: number;      // 상단 빗물 드리즐 확률(칸당 틱)
  strikeSec?: number;  // 번개 점화 주기(초)
  regrowP?: number;    // 물길 닿은 재·씨앗 발아 확률
  cellPx?: number;     // 셀 크기(px)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Colors = {
  night: RGB; stone: RGB; dirt: RGB; sandA: RGB; sandB: RGB; water: RGB; ice: RGB;
  fire: RGB; flame: RGB; ash: RGB; smoke: RGB; plant: RGB; leaf: RGB; glow: RGB;
};

const FIELD_LABEL = "생태계 통합 셀 오토마타 데모";
const EMPTY = 0, SAND = 1, WATER = 2, WOOD = 4, FIRE = 5, ASH = 6, SMOKE = 7, SEED = 8, PLANT = 9, DIRT = 10, STONE = 11;
const TERRAIN_TICKS = 95;

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

export default function FullEcosystemScene({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  rainP = 0.015,
  strikeSec = 1.2,
  regrowP = 0.05,
  cellPx = 4,
}: FullEcosystemSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const gridRef = useRef(new Uint8Array(0)) as Box<Uint8Array>;
  const lifeRef = useRef(new Uint8Array(0)) as Box<Uint8Array>;
  const solidRef = useRef(new Float32Array(0)) as Box<Float32Array>;
  const dimRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const cellRef = useRef(cellPx) as Box<number>;
  const rainRef = useRef(rainP) as Box<number>;
  const strikeRef = useRef(strikeSec) as Box<number>;
  const regrowRef = useRef(regrowP) as Box<number>;
  const randRef = useRef(makePRNG(0x318a09)) as Box<() => number>;
  const tickRef = useRef(0) as Box<number>;
  const nextStrikeRef = useRef(72) as Box<number>;
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
    const i = y * cols + x;
    gridRef.current[i] = v;
    if (v !== FIRE && v !== SMOKE) lifeRef.current[i] = 0;
  }

  function terrainHeight(x: number): number {
    const { cols, rows } = dimRef.current;
    const u = x / cols;
    const basin = Math.pow(Math.max(0, (0.55 - u) / 0.55), 1.4);
    const hill = 0.18 * Math.sin(u * 9.0) * u;
    return Math.floor(rows * (0.68 - 0.26 * basin + hill));
  }

  function buildSceneStagger(): void {
    const rand = randRef.current;
    const { cols, rows } = dimRef.current;
    const solid = new Float32Array(cols * rows);
    const lakeLevel = Math.floor(rows * 0.58);
    for (let x = 0; x < cols; x++) {
      const top = terrainHeight(x);
      const edgeDist = Math.min(x, cols - 1 - x) / (cols / 2);
      for (let y = top; y < rows; y++) {
        const depthFrac = (y - top) / Math.max(1, rows - top);
        solid[y * cols + x] = TERRAIN_TICKS * (0.1 + 0.5 * edgeDist + 0.4 * depthFrac) * (0.85 + 0.3 * rand());
      }
      for (let wy = terrainHeight(x) - 1; wy >= lakeLevel; wy--) {
        if (x / cols < 0.42) {
          solid[wy * cols + x] = TERRAIN_TICKS * (0.85 + 0.25 * rand()) * (0.5 + 0.5 * (wy - lakeLevel + 1) / Math.max(1, terrainHeight(x) - lakeLevel));
        }
      }
      if (rand() < 0.42) {
        const ty = terrainHeight(x) - 1;
        if (ty >= 0 && x / cols >= 0.42) solid[ty * cols + x] = TERRAIN_TICKS * (1.05 + 0.35 * rand());
      }
    }
    solidRef.current = solid;
  }

  function resolveSolid(tick: number): void {
    const rand = randRef.current;
    const { cols, rows } = dimRef.current;
    const solid = solidRef.current;
    const lakeLevel = Math.floor(rows * 0.58);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (solid[i] > 0 && solid[i] <= tick && gridRef.current[i] === EMPTY) {
          if (y >= lakeLevel && x / cols < 0.42 && y < terrainHeight(x)) {
            gridRef.current[i] = WATER;
          } else if (y >= terrainHeight(x)) {
            const depth = y - terrainHeight(x);
            gridRef.current[i] = depth < 3 ? DIRT : (((x * 13 + y * 7) % 23 === 0) ? SAND : STONE);
          } else {
            gridRef.current[i] = rand() < 0.7 ? PLANT : SEED;
          }
          solid[i] = 0;
        }
      }
    }
  }

  function isFlammable(m: number): boolean { return m === PLANT || m === SEED || m === WOOD; }

  function moveInto(x: number, y: number, nx: number, ny: number, m: number): boolean {
    if (get(nx, ny) !== EMPTY) return false;
    const { cols } = dimRef.current;
    const l = lifeRef.current[y * cols + x];
    set(x, y, EMPTY);
    gridRef.current[ny * cols + nx] = m;
    lifeRef.current[ny * cols + nx] = l;
    return true;
  }

  function updateWater(x: number, y: number, dir: number): void {
    const rand = randRef.current;
    if (get(x, y) !== WATER) return;
    const douses: [number, number][] = [[0, 1], [-1, 0], [1, 0], [0, -1]];
    for (let i = 0; i < douses.length; i++) {
      if (get(x + douses[i][0], y + douses[i][1]) === FIRE) {
        set(x + douses[i][0], y + douses[i][1], ASH);
        if (rand() < 0.6) { set(x, y, EMPTY); return; }
      }
    }
    for (let j = 0; j < douses.length; j++) {
      const nx0 = x + douses[j][0], ny0 = y + douses[j][1];
      const m0 = get(nx0, ny0);
      if ((m0 === ASH || m0 === SEED) && rand() < regrowRef.current) set(nx0, ny0, PLANT);
    }
    if (moveInto(x, y, x, y + 1, WATER)) return;
    const first = dir > 0 ? -1 : 1;
    if (moveInto(x, y, x + first, y + 1, WATER)) return;
    if (moveInto(x, y, x - first, y + 1, WATER)) return;
    if (moveInto(x, y, x + first, y, WATER)) return;
    moveInto(x, y, x - first, y, WATER);
  }

  function updateFire(x: number, y: number): void {
    const rand = randRef.current;
    const { cols } = dimRef.current;
    if (get(x, y) !== FIRE) return;
    const i = y * cols + x;
    lifeRef.current[i]++;
    if (lifeRef.current[i] > 46) { set(x, y, rand() < 0.5 ? SMOKE : ASH); return; }
    const around: [number, number][] = [[0, 1], [0, -1], [-1, 0], [1, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]];
    let burned = false;
    for (let k = 0; k < around.length; k++) {
      const nx = x + around[k][0], ny = y + around[k][1];
      const m = get(nx, ny);
      if (isFlammable(m) && rand() < 0.34) { set(nx, ny, FIRE); burned = true; }
      else if (m === WATER) { set(x, y, ASH); return; }
    }
    if (burned) set(x, y, ASH);
  }

  function updateSmoke(x: number, y: number): void {
    const rand = randRef.current;
    const { cols } = dimRef.current;
    if (get(x, y) !== SMOKE) return;
    const i = y * cols + x;
    lifeRef.current[i]++;
    if (lifeRef.current[i] > 30) { set(x, y, EMPTY); return; }
    const bias = rand() < 0.6 ? -1 : 1;
    if (moveInto(x, y, x + (rand() < 0.3 ? bias : 0), y - 1, SMOKE)) return;
    moveInto(x, y, x + bias, y, SMOKE);
  }

  function updateSand(x: number, y: number, dir: number): void {
    const { cols } = dimRef.current;
    if (get(x, y) !== SAND) return;
    if (get(x, y + 1) === WATER) {
      gridRef.current[y * cols + x] = WATER;
      gridRef.current[(y + 1) * cols + x] = SAND;
      return;
    }
    if (moveInto(x, y, x, y + 1, SAND)) return;
    const first = dir > 0 ? -1 : 1;
    if (moveInto(x, y, x + first, y + 1, SAND)) return;
    moveInto(x, y, x - first, y + 1, SAND);
  }

  function updatePlant(x: number, y: number): void {
    const rand = randRef.current;
    const { cols } = dimRef.current;
    const m = get(x, y);
    if (m !== PLANT && m !== SEED) return;
    if (m === SEED) {
      const below = get(x, y + 1);
      if ((below === DIRT || below === STONE || below === ASH || below === PLANT || below === WOOD) && rand() < 0.08) {
        set(x, y, PLANT);
      }
      return;
    }
    if (get(x, y - 1) === EMPTY && rand() < 0.02) {
      set(x, y - 1, PLANT);
      lifeRef.current[(y - 1) * cols + x] = lifeRef.current[y * cols + x] + 1;
    }
  }

  function update(): void {
    const rand = randRef.current;
    const { cols, rows } = dimRef.current;
    tickRef.current++;
    const tick = tickRef.current;
    resolveSolid(tick);
    for (let rx = 0; rx < cols; rx++) {
      if (rand() < rainRef.current && get(rx, 0) === EMPTY) set(rx, 0, WATER);
    }
    if (tick >= nextStrikeRef.current) {
      nextStrikeRef.current = tick + Math.round(strikeRef.current * 60);
      for (let tries = 0; tries < 60; tries++) {
        const sx = Math.floor(rand() * cols);
        const sy = Math.floor(rand() * rows);
        const m = get(sx, sy);
        if (isFlammable(m)) { set(sx, sy, FIRE); break; }
      }
    }
    const dir = tick % 2 === 0 ? 1 : -1;
    for (let y = rows - 1; y >= 0; y--) {
      if (dir > 0) {
        for (let x = 0; x < cols; x++) {
          const c = get(x, y);
          if (c === SAND) updateSand(x, y, dir);
          else if (c === WATER) updateWater(x, y, dir);
          else if (c === FIRE) updateFire(x, y);
          else if (c === SMOKE) updateSmoke(x, y);
          else if (c === PLANT || c === SEED) updatePlant(x, y);
        }
      } else {
        for (let x = cols - 1; x >= 0; x--) {
          const c = get(x, y);
          if (c === SAND) updateSand(x, y, dir);
          else if (c === WATER) updateWater(x, y, dir);
          else if (c === FIRE) updateFire(x, y);
          else if (c === SMOKE) updateSmoke(x, y);
          else if (c === PLANT || c === SEED) updatePlant(x, y);
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
        if (m === EMPTY) c = shade(col.night, Math.round(glow * 40));
        else if (m === DIRT) c = shade(col.dirt, ((x * 7 + y * 13) % 5) - 2 + Math.round(glow * 14));
        else if (m === STONE) c = shade(col.stone, ((x * 11 + y * 5) % 5) - 2 + Math.round(glow * 10));
        else if (m === SAND) c = (x + y) % 3 === 0 ? shade(col.sandA, Math.round(glow * 18)) : shade(col.sandB, Math.round(glow * 18));
        else if (m === WATER) {
          const shimmer = Math.sin(t * 0.004 + x * 0.6 + y * 0.3) * 0.5 + 0.5;
          c = shade(shimmer > 0.5 ? col.ice : col.water, Math.round(glow * 12));
        } else if (m === FIRE) {
          const flick = Math.sin(t * 0.03 + x * 0.9 + y * 0.7) * 0.5 + 0.5;
          c = shade(flick > 0.5 ? col.flame : col.fire, Math.round(glow * 20));
        } else if (m === SMOKE) c = shade(col.smoke, ((x + y * 3) % 7) - 3 + Math.round(glow * 12));
        else if (m === ASH) c = shade(col.ash, ((x * 5 + y * 3) % 5) - 2 + Math.round(glow * 12));
        else if (m === SEED) c = shade(col.plant, -20 + Math.round(glow * 12));
        else c = (x + y) % 4 === 0 ? shade(col.leaf, Math.round(glow * 14)) : shade(col.plant, Math.round(glow * 14));
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
    lifeRef.current = new Uint8Array(dimRef.current.cols * dimRef.current.rows);
    imgRef.current = null;
    buildSceneStagger();
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
    rainRef.current = rainP;
    strikeRef.current = strikeSec;
    regrowRef.current = regrowP;
    randRef.current = makePRNG(0x318a09);
    tickRef.current = 0;
    nextStrikeRef.current = 72;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      stone: tokRGB(root, "--sand-stone"),
      dirt: tokRGB(root, "--sand-wood"),
      sandA: tokRGB(root, "--sand-grain"),
      sandB: tokRGB(root, "--sand-gold"),
      water: tokRGB(root, "--sand-water"),
      ice: tokRGB(root, "--sand-ice"),
      fire: tokRGB(root, "--sand-fire"),
      flame: tokRGB(root, "--sand-flame"),
      ash: tokRGB(root, "--sand-ash"),
      smoke: tokRGB(root, "--sand-smoke"),
      plant: tokRGB(root, "--sand-plant"),
      leaf: tokRGB(root, "--sand-leaf"),
      glow: tokRGB(root, "--sand-glow"),
    };
    fit();
    function onResize(): void { last = 0; acc = 0; fit(); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let i = 0; i < 110; i++) update();
      draw(1800);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rainP, strikeSec, regrowP, cellPx]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>비·불·물·풀이 한 격자에서 순환합니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>6</b>종 재료 · 생태계 순환</span>
          <span className={styles.metaDim}>canvas · ImageData putImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
