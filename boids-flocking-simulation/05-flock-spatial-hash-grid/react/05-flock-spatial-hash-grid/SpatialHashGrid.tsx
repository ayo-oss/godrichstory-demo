// SpatialHashGrid — vanilla 판(run/315/demo/05-flock-spatial-hash-grid/index.html) 의 React 포트.
// 화면을 48px 셀로 나눠 Map<"cx,cy", 인덱스[]> 로 등록하고 자기+인접 8칸만 조사한다 —
// 1000개체를 전수 비교 없이 무리로 만든다. 미리보기는 시드 고정 Lissajous 조류 신호.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpatialHashGrid.module.scss";

export type SpatialHashGridProps = {
  duration?: string;
  easing?: string;
  color?: string;
  birds?: number;  // 개체 수 — 변형 "개체 수" 축(1000 → 2000)
  cell?: number;   // 해시 셀 한 변(px)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Bird = { x: number; y: number; vx: number; vy: number };
type Colors = { ink: RGB; mist: RGB; dusk: RGB; lilac: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "공간 해시 그리드 보이드 실험판";
const STILL_T = 1.2;
const PERCEP = 30;
const SEP_R = 12;
const MAX_SPD = 78;
const MAX_FRC = 220;
const W_SEP = 1.6;
const W_ALI = 1.0;
const W_COH = 0.85;

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

export default function SpatialHashGrid({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f4cfb2",
  birds = 1000,
  cell = 48,
}: SpatialHashGridProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const cellRef = useRef(cell) as Box<number>;
  const birdsArrRef = useRef<Bird[]>([]) as Box<Bird[]>;
  const gridRef = useRef(new Map<string, number[]>()) as Box<Map<string, number[]>>;
  const checksRef = useRef(0) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(birds));
  const [checks, setChecks] = useState("0");
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--flock-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  // 개체 풀 리빌드 — birds prop 이 바뀌거나 최초 마운트 때
  function buildBirds(): void {
    const rand = makePRNG(0x0b0105);
    const arr: Bird[] = [];
    for (let i = 0; i < birds; i++) {
      arr.push({
        x: rand() * 400,
        y: rand() * 180,
        vx: (rand() - 0.5) * MAX_SPD,
        vy: (rand() - 0.5) * MAX_SPD,
      });
    }
    birdsArrRef.current = arr;
    setN(String(birds));
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
  }

  function cellKey(cx: number, cy: number): string {
    return cx + "," + cy;
  }

  // ── 공간 해시 — 매 프레임 다시 짓는다(개체가 매 프레임 옮겨가므로) ──
  function buildGrid(): void {
    const grid = gridRef.current;
    const birdsArr = birdsArrRef.current;
    const CELL = cellRef.current;
    grid.clear();
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      const cx = Math.floor(b.x / CELL);
      const cy = Math.floor(b.y / CELL);
      const k = cellKey(cx, cy);
      const arr = grid.get(k);
      if (arr) arr.push(i);
      else grid.set(k, [i]);
    }
  }

  function step(dt: number): void {
    buildGrid();
    const grid = gridRef.current;
    const birdsArr = birdsArrRef.current;
    const { w: W, h: H } = sizeRef.current;
    const CELL = cellRef.current;
    let checks = 0;
    const driftX = (pxRef.current - 0.5) * 2;
    const driftY = (pyRef.current - 0.5) * 2;
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      let sx = 0, sy = 0, ax = 0, ay = 0, cx0 = 0, cy0 = 0;
      let sepN = 0, aliN = 0, cohN = 0;
      const gcx = Math.floor(b.x / CELL);
      const gcy = Math.floor(b.y / CELL);
      // 자기 셀 + 인접 8칸(3x3) 만 조사 — 이것이 이 데모의 핵심
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const arr = grid.get(cellKey(gcx + ox, gcy + oy));
          if (!arr) continue;
          for (let a = 0; a < arr.length; a++) {
            const j = arr[a];
            if (j === i) continue;
            checks++;
            const o = birdsArr[j];
            const dx = o.x - b.x;
            const dy = o.y - b.y;
            const d = Math.hypot(dx, dy);
            if (d < PERCEP && d > 0.0001) {
              if (d < SEP_R) { sx -= (dx / d / d) * SEP_R; sy -= (dy / d / d) * SEP_R; sepN++; }
              ax += o.vx; ay += o.vy; aliN++;
              cx0 += dx; cy0 += dy; cohN++;
            }
          }
        }
      }
      let fx = 0, fy = 0;
      if (sepN) { fx += (sx / sepN) * W_SEP; fy += (sy / sepN) * W_SEP; }
      if (aliN) { fx += (ax / aliN - b.vx) * 0.06 * W_ALI; fy += (ay / aliN - b.vy) * 0.06 * W_ALI; }
      if (cohN) { fx += (cx0 / cohN) * 0.05 * W_COH; fy += (cy0 / cohN) * 0.05 * W_COH; }
      fx += driftX * 8;
      fy += driftY * 8;

      const fl = Math.hypot(fx, fy);
      if (fl > MAX_FRC) { fx = (fx / fl) * MAX_FRC; fy = (fy / fl) * MAX_FRC; }
      b.vx += fx * dt;
      b.vy += fy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPD) { b.vx = (b.vx / sp) * MAX_SPD; b.vy = (b.vy / sp) * MAX_SPD; }
      else if (sp < MAX_SPD * 0.3) { b.vx = (b.vx / (sp || 1)) * MAX_SPD * 0.3; b.vy = (b.vy / (sp || 1)) * MAX_SPD * 0.3; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    for (let w = 0; w < birdsArr.length; w++) {
      const bb = birdsArr[w];
      if (bb.x < 0) bb.x += W; else if (bb.x > W) bb.x -= W;
      if (bb.y < 0) bb.y += H; else if (bb.y > H) bb.y -= H;
    }
    checksRef.current = checks;
  }

  function draw(tSec: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const birdsArr = birdsArrRef.current;
    if (!ctx || !col || birdsArr.length === 0) return;
    const { w: W, h: H } = sizeRef.current;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);

    const hg = ctx.createLinearGradient(0, 0, 0, H);
    hg.addColorStop(0, `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},0.2)`);
    hg.addColorStop(1, `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H * 0.5);

    ctx.globalCompositeOperation = "lighter";
    const slot = ((tSec * 6) | 0) % 7;
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      const sp = Math.hypot(b.vx, b.vy);
      const flash = i % 7 === slot ? 0.22 : 0;
      const a = 0.34 + Math.min(0.4, (sp / MAX_SPD) * 0.4) + flash;
      const col2 = i % 23 === 0 ? col.lilac : col.mist;
      ctx.fillStyle = `rgba(${col2[0]},${col2[1]},${col2[2]},${a.toFixed(3)})`;
      ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
    }

    setChecks(String(checksRef.current));
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 6.2;
      pxRef.current = 0.5 + 0.4 * Math.sin(ph);
      pyRef.current = 0.5 + 0.32 * Math.sin(ph * 1.4 + 0.6);
    }
    step(dt);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) { step(0.016); draw(STILL_T); }
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) { step(0.016); draw(STILL_T); }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    cellRef.current = cell;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      dusk: tokRGB(root, "--flock-dusk"),
      lilac: tokRGB(root, "--flock-lilac"),
      mist: tokRGB(root, "--flock-mist"),
    };
    buildBirds();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      for (let s = 0; s < 30; s++) step(0.033);
      draw(STILL_T);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birds, cell]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M40 40h64v64H40z" opacity=".2"/><path d="M96 32H40a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h56a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-8 56H48V48h40Zm88-56h-56a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h56a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8m-8 56h-40V48h40Zm-72 40H40a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h56a8 8 0 0 0 8-8v-56a8 8 0 0 0-8-8m-8 56H48v-40h40Zm88-56h-56a8 8 0 0 0-8 8v56a8 8 0 0 0 8 8h56a8 8 0 0 0 8-8v-56a8 8 0 0 0-8-8m-8 56h-40v-40h40Z"/></g></svg>
          <span>화면을 48px 셀로 나눠 자기 셀과 인접 8칸만 조사합니다 — 개체 1000마리라도 전수 비교(1,000×1,000) 없이 무리가 만들어집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>개체 · 프레임당 이웃 조사 <b className={styles.val}>{checks}</b>회</span>
          <span className={styles.metaDim}>Map 해시 · 3x3 셀 조사 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
