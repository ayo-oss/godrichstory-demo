// FireBurnSpread — vanilla 판(run/318/demo/04-sand-fire-burn-spread/index.html) 의 React 포트.
// 불 번짐 소모 규칙 — 불 칸은 이웃 나무·기름을 확률로 점화하고 수명이 다하면 재가 되며 연기를 남긴다.
// 계단식 나무 발판 3단 + 바닥 기름 웅덩이를 ~1.2초마다 다른 위치에서 재점화해 화면이 늘 활동한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireBurnSpread.module.scss";

export type FireBurnSpreadProps = {
  duration?: string;
  easing?: string;
  color?: string;
  igniteP?: number;   // 이웃 점화 확률 — 변형 "점화 확률" 축(0.02 은은 · 0.14 폭발)
  life?: number;      // 불 수명(틱)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Ignition = { at: number; kind: string };
type Colors = {
  night: RGB; glow: RGB; fire: RGB; flame: RGB; gold: RGB;
  ash: RGB; smoke: RGB; wood: RGB;
};

const TAU = Math.PI * 2;
const FIELD_LABEL = "불 번짐 셀 오토마타 데모";
const EMPTY = 0, WOOD = 4, FIRE = 5, ASH = 6, SMOKE = 7, OIL = 8;
const CELL = 4;
const STEP = 1000 / 60;

// 시드 고정 PRNG — mulberry32. 미리보기가 항상 같은 연소 순서로 흐른다
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

export default function FireBurnSpread({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  igniteP = 0.06,
  life = 14,
}: FireBurnSpreadProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const ignitePRef = useRef(igniteP) as Box<number>;
  const lifeRef = useRef(life) as Box<number>;
  const gridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const lifeGridRef = useRef<Uint8Array | null>(null) as Box<Uint8Array | null>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const dimsRef = useRef({ cols: 0, rows: 0 }) as Box<{ cols: number; rows: number }>;
  const tickRef = useRef(0) as Box<number>;
  const ignRef = useRef<Ignition[]>([]) as Box<Ignition[]>;
  const ignIdxRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const randRef = useRef(makePRNG(0x318a44)) as Box<() => number>;
  const [n, setN] = useState(String(Math.round(igniteP * 100)));
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

  // ── 장면 — 계단식 나무 발판 3단 + 바닥 기름 웅덩이 ──
  // 오일은 '밝은 fire 색조로 조명된 나무' — 가연물이되 셀 색만 fire 톤으로 둔다(기름 표면의 광택)
  function build(): void {
    const { cols, rows } = dimsRef.current;
    const grid = new Uint8Array(cols * rows);
    const lifeGrid = new Uint8Array(cols * rows);
    const rowsPer = Math.max(2, Math.round(rows * 0.05));
    const y0 = rows - Math.max(2, Math.round(rows * 0.16));
    for (let step = 0; step < 3; step++) {
      const x0 = Math.round(cols * (0.06 + step * 0.24));
      const x1 = Math.round(cols * (0.3 + step * 0.24));
      const yy = y0 - step * Math.round(rows * 0.16);
      for (let x = x0; x < x1; x++)
        for (let y = yy; y < yy + rowsPer; y++)
          if (x >= 0 && x < cols && y >= 0 && y < rows) grid[idx(x, y)] = WOOD;
    }
    for (let x = 0; x < cols; x++)
      for (let y = rows - 2; y < rows; y++)
        grid[idx(x, y)] = OIL;
    gridRef.current = grid;
    lifeGridRef.current = lifeGrid;
    const ctx = ctxRef.current;
    if (ctx) imgRef.current = ctx.createImageData(cols, rows);
  }

  // ── 점화 스케줄 — t=0 첫 나무, 이후 ~1.2초마다 다른 위치(우측 발판 → 기름) 재점화 ──
  function scheduleIgnitions(): void {
    ignRef.current = [
      { at: 0.05, kind: "wood1" },
      { at: 1.2, kind: "wood3" },
      { at: 2.4, kind: "oil" },
      { at: 3.6, kind: "wood2" },
      { at: 4.8, kind: "oil" },
      { at: 6.0, kind: "wood1" },
      { at: 7.2, kind: "wood3" },
      { at: 8.4, kind: "oil" },
    ];
    ignIdxRef.current = 0;
  }

  function doIgnite(kind: string): void {
    if (!gridRef.current || !lifeGridRef.current) return;
    const grid: Uint8Array = gridRef.current;
    const lifeGrid: Uint8Array = lifeGridRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    const y0 = rows - Math.max(2, Math.round(rows * 0.16));
    const rowsPer = Math.max(2, Math.round(rows * 0.05));
    function spark(cx: number, top: number, w: number, h: number, mat: number): void {
      for (let k = 0; k < 60; k++) {
        const x = cx + Math.floor(rand() * w);
        const y = top + Math.floor(rand() * h);
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        const i = idx(x, y);
        if (grid[i] === mat) { grid[i] = FIRE; lifeGrid[i] = lifeRef.current; return; }
      }
    }
    if (kind === "wood1") spark(Math.round(cols * 0.1), y0, Math.round(cols * 0.22), rowsPer, WOOD);
    else if (kind === "wood2") spark(Math.round(cols * 0.34), y0 - Math.round(rows * 0.16), Math.round(cols * 0.22), rowsPer, WOOD);
    else if (kind === "wood3") spark(Math.round(cols * 0.58), y0 - Math.round(rows * 0.32), Math.round(cols * 0.22), rowsPer, WOOD);
    else spark(Math.round(cols * 0.1), rows - 2, Math.round(cols * 0.8), 2, OIL);
  }

  function update(): void {
    const grid = gridRef.current;
    const lifeGrid = lifeGridRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    if (!grid || !lifeGrid) return;
    tickRef.current++;
    const tick = tickRef.current;
    const moved = new Uint8Array(cols * rows);
    for (let y = rows - 1; y >= 0; y--) {
      const ltr = (tick & 1) === 0; // 홀짝 스캔 방향 교차 — 번짐 비대칭 방지
      for (let s = 0; s < cols; s++) {
        const x = ltr ? s : cols - 1 - s;
        const i = idx(x, y);
        if (moved[i]) continue;
        const m = grid[i];
        if (m === FIRE) {
          // 이웃 점화 — 4방향의 나무·기름을 확률로 불로
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          for (let d = 0; d < 4; d++) {
            const nx = x + nb[d][0], ny = y + nb[d][1];
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            const j = idx(nx, ny);
            if ((grid[j] === WOOD || grid[j] === OIL) && rand() < ignitePRef.current) {
              grid[j] = FIRE; lifeGrid[j] = lifeRef.current; moved[j] = 1;
            }
          }
          // 수명 감소 — 다하면 재, 위 빈칸에 연기 시도
          if (lifeGrid[i] <= 1) {
            grid[i] = ASH;
            if (y > 0 && grid[idx(x, y - 1)] === EMPTY && rand() < 0.5) {
              grid[idx(x, y - 1)] = SMOKE;
              if (y > 1 && grid[idx(x, y - 2)] === EMPTY && rand() < 0.5) grid[idx(x, y - 2)] = SMOKE;
            }
          } else {
            lifeGrid[i]--;
          }
        } else if (m === SMOKE) {
          // 연기 — 위로 한 칸, 막히면 옆. 오래 남지 않게 확률 소멸
          if (rand() < 0.22) { grid[i] = EMPTY; continue; }
          const up = y > 0 ? idx(x, y - 1) : -1;
          if (up >= 0 && grid[up] === EMPTY) {
            grid[up] = SMOKE; grid[i] = EMPTY; moved[up] = 1;
          } else if (x > 0 && grid[idx(x - 1, y)] === EMPTY && rand() < 0.5) {
            grid[idx(x - 1, y)] = SMOKE; grid[i] = EMPTY;
          } else if (x < cols - 1 && grid[idx(x + 1, y)] === EMPTY && rand() < 0.5) {
            grid[idx(x + 1, y)] = SMOKE; grid[i] = EMPTY;
          }
        } else if (m === ASH) {
          // 재 — 낙하(아래 빈칸) + 확률 소멸. 소멸한 자리는 연기 없이 비운다
          if (y < rows - 1 && grid[idx(x, y + 1)] === EMPTY) {
            grid[idx(x, y + 1)] = ASH; grid[i] = EMPTY; moved[idx(x, y + 1)] = 1;
          } else if (rand() < 0.012) { grid[i] = EMPTY; }
        }
      }
    }
  }

  // ── 렌더 — ImageData 버퍼 → putImageData. 1 픽셀 = 1 칸 ──
  function px(buf: Uint8ClampedArray, o: number, c: RGB, k: number): void {
    buf[o] = c[0] * k;
    buf[o + 1] = c[1] * k;
    buf[o + 2] = c[2] * k;
    buf[o + 3] = 255;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const img = imgRef.current;
    const grid = gridRef.current;
    const { w: W, h: H } = sizeRef.current;
    const { cols, rows } = dimsRef.current;
    const rand = randRef.current;
    if (!ctx || !col || !img || !grid) return;
    const buf = img.data;
    let i: number, o: number;
    for (i = 0; i < cols * rows; i++) {
      o = i * 4;
      buf[o] = col.night[0]; buf[o + 1] = col.night[1]; buf[o + 2] = col.night[2]; buf[o + 3] = 255;
    }
    const flicker = 0.5 + 0.5 * Math.sin(t * 9.3) * Math.cos(t * 6.1);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        i = idx(x, y);
        o = i * 4;
        const m = grid[i];
        if (m === WOOD) px(buf, o, col.wood, 1);
        else if (m === OIL) px(buf, o, col.fire, 0.9);
        else if (m === ASH) px(buf, o, col.ash, 0.95);
        else if (m === SMOKE) px(buf, o, col.smoke, 0.8);
        else if (m === FIRE) {
          // 매 틱 fire/flame/gold 랜덤 스왑 — 타오르는 질감
          const r3 = rand();
          const fc = r3 < 0.4 ? col.fire : r3 < 0.8 ? col.flame : col.gold;
          px(buf, o, fc, 0.85 + 0.3 * flicker);
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // 잔광(안개) — 중심이 sin/cos 로 천천히 도는 radial gradient, 알파 낮게 — 화면이 늘 살아 있다
    const gx = W * (0.5 + 0.3 * Math.sin(t * 0.9));
    const gy = H * (0.55 + 0.26 * Math.cos(t * 0.7));
    const gr = Math.max(W, H) * 0.52;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    g.addColorStop(0, `rgba(${col.glow.join(",")},0.07)`);
    g.addColorStop(1, `rgba(${col.glow.join(",")},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
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
    scheduleIgnitions();
    tickRef.current = 0;
  }

  function stillFrame(): void {
    // reduce — 점화 직후 몇 틱만 돌리고 한 장
    doIgnite("wood1");
    for (let k = 0; k < 12; k++) update();
    draw(0.2);
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
      const t = tickRef.current / 60;
      const igns = ignRef.current;
      while (ignIdxRef.current < igns.length && igns[ignIdxRef.current].at <= t) {
        doIgnite(igns[ignIdxRef.current].kind);
        ignIdxRef.current++;
      }
      acc -= STEP;
    }
    draw((now - t0) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    ignitePRef.current = igniteP;
    lifeRef.current = life;
    colRef.current = {
      night: tokRGB(root, "--sand-night"),
      glow: tokRGB(root, "--sand-glow"),
      fire: tokRGB(root, "--sand-fire"),
      flame: tokRGB(root, "--sand-flame"),
      gold: tokRGB(root, "--sand-gold"),
      ash: tokRGB(root, "--sand-ash"),
      smoke: tokRGB(root, "--sand-smoke"),
      wood: tokRGB(root, "--sand-wood"),
    };
    randRef.current = makePRNG(0x318a44);
    fit();
    setN(String(Math.round(igniteP * 100)));
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
  }, [igniteP, life]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>불은 이웃한 나무를 확률로 태우고, 스스로는 재가 됩니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>점화 확률 %</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
