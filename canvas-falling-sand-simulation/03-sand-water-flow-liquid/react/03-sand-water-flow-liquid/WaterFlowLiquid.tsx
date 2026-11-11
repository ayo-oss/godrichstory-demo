// WaterFlowLiquid — vanilla 판(run/318/demo/03-sand-water-flow-liquid/index.html) 의 React 포트.
// 물 흐름 — 모래는 낙하+대각 규칙, 물은 아래→대각→좌우(매 프레임 방향 교대, 한 번에 SPREAD칸).
// 울퉁불퉁한 고정 돌 지형 위에 모래는 쌓이고 물은 낮은 곳으로 흘러 고인다. ImageData 렌더.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WaterFlowLiquid.module.scss";

export type WaterFlowLiquidProps = {
  duration?: string;
  easing?: string;
  color?: string;
  spread?: number;    // 물 좌우 퍼짐 칸수/프레임 — 변형 "물 퍼짐" 축(1 기본 · 3 빠른 유체)
  sandP?: number;     // 모래 스포너 칸별 매 틱 생성 확률
  waterP?: number;    // 물 스포너 칸별 매 틱 생성 확률
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "모래와 물 흐름 셀 오토마타 데모";
const CELL = 4;
const STEP = 1 / 60;
const ZONE_W = 10;
const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3;

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

export default function WaterFlowLiquid({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  spread = 1,
  sandP = 0.34,
  waterP = 0.3,
}: WaterFlowLiquidProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, cols: 0, rows: 0 }) as Box<{ w: number; h: number; cols: number; rows: number }>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const shadeRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const sandXRef = useRef(0) as Box<number>;
  const waterXRef = useRef(0) as Box<number>;
  const flowRef = useRef(1) as Box<number>;
  const colRef = useRef<{ night: RGB; glow: RGB; grain: RGB; gold: RGB; water: RGB; ice: RGB; stone: RGB } | null>(null);
  const spreadRef = useRef(spread) as Box<number>;
  const sandPRef = useRef(sandP) as Box<number>;
  const waterPRef = useRef(waterP) as Box<number>;
  const randRef = useRef(makePRNG(0x318a03)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const [n, setN] = useState(String(spread));
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

  // 울퉁불퉁한 고정 돌 지형 2~3단 — 좌 언덕 · 중앙 능선 · 우 언덕 + 바닥 줄
  function terrain(): void {
    const { cols, rows } = sizeRef.current;
    const grid = gridRef.current;
    if (!grid) return;
    let x: number, y: number;
    const h1 = Math.round(rows * 0.22);
    for (x = 0; x < Math.round(cols * 0.3); x++) {
      const rise = Math.round((1 - x / (cols * 0.3)) * h1 * 0.6);
      for (y = 0; y <= rise; y++) grid[idx(x, rows - 1 - y)] = STONE;
    }
    const h2 = Math.round(rows * 0.34);
    const cx0 = Math.round(cols * 0.44), cx1 = Math.round(cols * 0.62);
    for (x = cx0; x < cx1; x++) {
      const k = 1 - Math.abs((x - (cx0 + cx1) / 2) / ((cx1 - cx0) / 2));
      const rise2 = Math.round(k * h2);
      for (y = 0; y <= rise2; y++) grid[idx(x, rows - 1 - y)] = STONE;
    }
    const h3 = Math.round(rows * 0.26);
    for (x = Math.round(cols * 0.76); x < cols; x++) {
      const k3 = (x - cols * 0.76) / (cols * 0.24);
      const rise3 = Math.round(k3 * h3 * 0.7);
      for (y = 0; y <= rise3; y++) grid[idx(x, rows - 1 - y)] = STONE;
    }
    for (x = 0; x < cols; x++) grid[idx(x, rows - 1)] = STONE;
  }

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
    sandXRef.current = Math.max(0, Math.round(cols * 0.16));
    waterXRef.current = Math.max(0, Math.round(cols * 0.84 - ZONE_W));
    terrain();
    ctxRef.current = ctx;
  }

  function spawnStep(): void {
    const { cols } = sizeRef.current;
    const grid = gridRef.current;
    const shade = shadeRef.current;
    if (!grid || !shade) return;
    const rand = randRef.current;
    for (let k = 0; k < ZONE_W; k++) {
      let x = sandXRef.current + k;
      if (x >= 0 && x < cols && rand() < sandPRef.current) {
        const i = idx(x, 0);
        if (grid[i] === EMPTY) { grid[i] = SAND; shade[i] = rand() < 0.5 ? 0 : 1; }
      }
      x = waterXRef.current + k;
      if (x >= 0 && x < cols && rand() < waterPRef.current) {
        const i = idx(x, 0);
        if (grid[i] === EMPTY) grid[i] = WATER;
      }
    }
  }

  function swap(a: number, b: number): void {
    const grid = gridRef.current!;
    const shade = shadeRef.current!;
    const g = grid[a]; grid[a] = grid[b]; grid[b] = g;
    const s = shade[a]; shade[a] = shade[b]; shade[b] = s;
  }

  function update(): void {
    const { cols, rows } = sizeRef.current;
    const grid = gridRef.current;
    if (!grid) return;
    const rand = randRef.current;
    flowRef.current = -flowRef.current;   // 물 좌우 방향 매 틱 교대
    const flowDir = flowRef.current;
    for (let y = rows - 2; y >= 0; y--) {
      for (let x = 0; x < cols; x++) {
        const i = idx(x, y);
        const c = grid[i];
        if (c !== SAND && c !== WATER) continue;
        // 아래로 — 모래는 물 위로 가라앉음(밀도)
        const bi = idx(x, y + 1);
        if (grid[bi] === EMPTY || (c === SAND && grid[bi] === WATER)) {
          swap(i, bi);
          continue;
        }
        if (c === SAND) {
          // 대각선 — 좌하 → 우하 순서(물 칸으로도 미끄러짐)
          const dir = rand() < 0.5 ? -1 : 1;
          let ok1 = false, ok2 = false;
          let nx = x + dir;
          if (nx >= 0 && nx < cols) {
            const t1 = grid[idx(nx, y + 1)];
            const t1s = grid[idx(nx, y)];
            if ((t1 === EMPTY || t1 === WATER) && (t1s === EMPTY || t1s === WATER)) ok1 = true;
          }
          if (!ok1) {
            nx = x - dir;
            if (nx >= 0 && nx < cols) {
              const t2 = grid[idx(nx, y + 1)];
              const t2s = grid[idx(nx, y)];
              if ((t2 === EMPTY || t2 === WATER) && (t2s === EMPTY || t2s === WATER)) ok2 = true;
            }
          }
          if (ok1 || ok2) swap(i, idx(x + (ok1 ? dir : -dir), y + 1));
        } else {
          // 물 — 대각선
          const wdir = flowDir;
          let wok1 = false, wok2 = false;
          let nx = x + wdir;
          if (nx >= 0 && nx < cols && grid[idx(nx, y + 1)] === EMPTY && grid[idx(nx, y)] === EMPTY) wok1 = true;
          if (!wok1) {
            nx = x - wdir;
            if (nx >= 0 && nx < cols && grid[idx(nx, y + 1)] === EMPTY && grid[idx(nx, y)] === EMPTY) wok2 = true;
          }
          if (wok1 || wok2) {
            swap(i, idx(x + (wok1 ? wdir : -wdir), y + 1));
            continue;
          }
          // 물 — 좌우 퍼짐(한 번에 SPREAD칸, 통로 검사)
          let moved = false;
          for (let s = 1; s <= spreadRef.current; s++) {
            nx = x + flowDir * s;
            if (nx < 0 || nx >= cols) break;
            const ti = idx(nx, y);
            if (grid[ti] === EMPTY) {
              let clear = true;
              for (let q = 1; q <= s; q++) {
                if (grid[idx(x + flowDir * q, y)] !== EMPTY) { clear = false; break; }
              }
              if (clear) { swap(i, ti); moved = true; break; }
            } else break;
          }
          if (!moved) {
            for (let s2 = 1; s2 <= spreadRef.current; s2++) {
              nx = x - flowDir * s2;
              if (nx < 0 || nx >= cols) break;
              const ti2 = idx(nx, y);
              if (grid[ti2] === EMPTY) {
                let clear2 = true;
                for (let q2 = 1; q2 <= s2; q2++) {
                  if (grid[idx(x - flowDir * q2, y)] !== EMPTY) { clear2 = false; break; }
                }
                if (clear2) { swap(i, ti2); moved = true; break; }
              } else break;
            }
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
    const Wp = Math.round(W), Hp = Math.round(H);
    if (!imgRef.current || imgRef.current.width !== Wp || imgRef.current.height !== Hp) {
      imgRef.current = ctx.createImageData(Wp, Hp);
    }
    const img = imgRef.current!;
    const buf = img.data;
    // 느린 잔광 중심 — sin/cos 로 천천히 도는 radial 근사
    const gx = 0.5 + 0.36 * Math.sin(t * 0.17);
    const gy = 0.5 + 0.3 * Math.cos(t * 0.13);
    const gr = Math.max(W, H) * 0.7;
    const r2 = gr * gr;
    let o: number;
    for (let py = 0; py < Hp; py++) {
      for (let px = 0; px < Wp; px++) {
        o = (py * Wp + px) * 4;
        buf[o] = col.night[0]; buf[o + 1] = col.night[1]; buf[o + 2] = col.night[2]; buf[o + 3] = 255;
        const dxg = px - gx * Wp, dyg = py - gy * Hp;
        const d2 = (dxg * dxg + dyg * dyg) / r2;
        if (d2 < 1) {
          const a = 0.07 * (1 - d2);
          buf[o] += (col.glow[0] - col.night[0]) * a;
          buf[o + 1] += (col.glow[1] - col.night[1]) * a;
          buf[o + 2] += (col.glow[2] - col.night[2]) * a;
        }
      }
    }
    // 격자 렌더 — CELL 4px 블록
    let c0: RGB;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid[idx(x, y)];
        if (cell === EMPTY) continue;
        if (cell === SAND) c0 = shade[idx(x, y)] ? col.gold : col.grain;
        else if (cell === WATER) c0 = col.water;
        else c0 = col.stone;
        const bx = x * CELL, by = y * CELL;
        const bw = Math.min(CELL, Wp - bx), bh = Math.min(CELL, Hp - by);
        for (let yy = 0; yy < bh; yy++) {
          const rowo = ((by + yy) * Wp + bx) * 4;
          for (let xx = 0; xx < bw; xx++) {
            const oo = rowo + xx * 4;
            buf[oo] = c0[0]; buf[oo + 1] = c0[1]; buf[oo + 2] = c0[2];
          }
        }
      }
    }
    // 물 표면 하이라이트 — 물 셀 바로 위가 빈 칸이면 ice 톤 한 줄
    for (let y = 1; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (grid[idx(x, y)] === WATER && grid[idx(x, y - 1)] === EMPTY) {
          const hx = x * CELL, hy = y * CELL;
          if (hx < Wp && hy < Hp) {
            const ho = (hy * Wp + hx) * 4;
            buf[ho] = col.ice[0]; buf[ho + 1] = col.ice[1]; buf[ho + 2] = col.ice[2];
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
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
    spreadRef.current = spread;
    sandPRef.current = sandP;
    waterPRef.current = waterP;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      grain: tokRGB(root, "--sand-grain"),
      gold: tokRGB(root, "--sand-gold"),
      water: tokRGB(root, "--sand-water"),
      ice: tokRGB(root, "--sand-ice"),
      stone: tokRGB(root, "--sand-stone"),
    };
    randRef.current = makePRNG(0x318a03);
    flowRef.current = 1;
    imgRef.current = null;
    fit();
    setN(String(spread));
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
  }, [spread, sandP, waterP]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>물은 아래가 막히면 좌우로 퍼지고, 모래는 그 위에 쌓입니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>칸 물 퍼짐 1칸</span>
          <span className={styles.metaDim}>canvas · ImageData putImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
