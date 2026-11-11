// PredatorAttack — vanilla 판(run/315/demo/04-flock-predator-attack/index.html) 의 React 포트.
// 보이드 3규칙(분리·정렬·결합)에 천적 도망 벡터를 더해 무리가 갈라졌다 재봉합한다.
// 미리보기는 시드 고정 Lissajous 가상 천적.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PredatorAttack.module.scss";

export type PredatorAttackProps = {
  duration?: string;
  easing?: string;
  color?: string;
  birds?: number;      // 개체 수
  fleeRadius?: number; // 천적 도망 반경(px) — 변형 "천적 반경" 축(90 → 160)
  fleeGain?: number;   // 도망 힘 배율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Bird = { x: number; y: number; vx: number; vy: number };
type Colors = { ink: RGB; mist: RGB; glow: RGB; dusk: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "새 떼 천적 회피 실험판. 화살표 키로 천적을 움직일 수 있습니다";
const STILL_T = 1.2;
const PERCEP = 40;
const SEP_R = 18;
const MAX_SPD = 96;
const MAX_FRC = 260;
const W_SEP = 1.7;
const W_ALI = 1.0;
const W_COH = 0.9;

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

export default function PredatorAttack({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f4cfb2",
  birds = 160,
  fleeRadius = 90,
  fleeGain = 1.0,
}: PredatorAttackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const fleeRRef = useRef(fleeRadius) as Box<number>;
  const fleeGRef = useRef(fleeGain) as Box<number>;
  const birdsArrRef = useRef<Bird[]>([]) as Box<Bird[]>;
  const predXRef = useRef(0.5) as Box<number>;
  const predYRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(birds));
  const [rOut, setROut] = useState(String(fleeRadius));
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
    const rand = makePRNG(0x0b0104);
    const arr: Bird[] = [];
    for (let i = 0; i < birds; i++) {
      arr.push({
        x: rand() * 300,
        y: rand() * 140,
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

  function step(dt: number): void {
    const birdsArr = birdsArrRef.current;
    const { w: W, h: H } = sizeRef.current;
    const predPx = predXRef.current * W;
    const predPy = predYRef.current * H;
    const FLEE_R = fleeRRef.current;
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      let sx = 0, sy = 0, ax = 0, ay = 0, cx0 = 0, cy0 = 0;
      let sepN = 0, aliN = 0, cohN = 0;
      for (let j = 0; j < birdsArr.length; j++) {
        if (i === j) continue;
        const o = birdsArr[j];
        let dx = o.x - b.x, dy = o.y - b.y;
        if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H; else if (dy < -H / 2) dy += H;
        const d = Math.hypot(dx, dy);
        if (d < PERCEP && d > 0.0001) {
          if (d < SEP_R) { sx -= (dx / d / d) * SEP_R; sy -= (dy / d / d) * SEP_R; sepN++; }
          ax += o.vx; ay += o.vy; aliN++;
          cx0 += dx; cy0 += dy; cohN++;
        }
      }
      let fx = 0, fy = 0;
      if (sepN) { fx += (sx / sepN) * W_SEP; fy += (sy / sepN) * W_SEP; }
      if (aliN) { fx += (ax / aliN - b.vx) * 0.06 * W_ALI; fy += (ay / aliN - b.vy) * 0.06 * W_ALI; }
      if (cohN) { fx += (cx0 / cohN) * 0.04 * W_COH; fy += (cy0 / cohN) * 0.04 * W_COH; }

      // 도망 — 천적 반경 안이면 거리에 반비례한 힘(가까울수록 급격히 강함)
      let pdx = b.x - predPx, pdy = b.y - predPy;
      if (pdx > W / 2) pdx -= W; else if (pdx < -W / 2) pdx += W;
      if (pdy > H / 2) pdy -= H; else if (pdy < -H / 2) pdy += H;
      const pd = Math.hypot(pdx, pdy);
      if (pd < FLEE_R && pd > 0.0001) {
        const t = (FLEE_R - pd) / FLEE_R;
        const mag = t * t * MAX_FRC * 3.2 * fleeGRef.current;
        fx += (pdx / pd) * mag;
        fy += (pdy / pd) * mag;
      }

      const fl = Math.hypot(fx, fy);
      if (fl > MAX_FRC) { fx = (fx / fl) * MAX_FRC; fy = (fy / fl) * MAX_FRC; }
      b.vx += fx * dt;
      b.vy += fy * dt;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > MAX_SPD) { b.vx = (b.vx / sp) * MAX_SPD; b.vy = (b.vy / sp) * MAX_SPD; }
      else if (sp < MAX_SPD * 0.28) { b.vx = (b.vx / (sp || 1)) * MAX_SPD * 0.28; b.vy = (b.vy / (sp || 1)) * MAX_SPD * 0.28; }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0) b.x += W; else if (b.x > W) b.x -= W;
      if (b.y < 0) b.y += H; else if (b.y > H) b.y -= H;
    }
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
    hg.addColorStop(0, `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},0.22)`);
    hg.addColorStop(1, `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H * 0.5);

    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < birdsArr.length; i++) {
      const b = birdsArr[i];
      const sp = Math.hypot(b.vx, b.vy);
      const a = 0.42 + Math.min(0.5, (sp / MAX_SPD) * 0.5);
      ctx.fillStyle = `rgba(${col.mist[0]},${col.mist[1]},${col.mist[2]},${a.toFixed(3)})`;
      const r = 2.1 + Math.min(1.4, (sp / MAX_SPD) * 1.4);
      ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    const ringR = fleeRRef.current * (0.34 + 0.05 * Math.sin(tSec * 3.1));
    const predPx = predXRef.current * W;
    const predPy = predYRef.current * H;
    ctx.strokeStyle = `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0.55)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(predPx, predPy, ringR, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},0.85)`;
    ctx.beginPath();
    ctx.arc(predPx, predPy, 3, 0, TAU);
    ctx.fill();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 5.4;
      predXRef.current = 0.5 + 0.4 * Math.sin(ph);
      predYRef.current = 0.5 + 0.34 * Math.sin(ph * 1.7 + 1.1);
    }
    step(dt);
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    predXRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    predYRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) { step(0.016); draw(STILL_T); }
  }

  function onLeave(): void {
    if (manualRef.current) { predXRef.current = -1; predYRef.current = -1; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) { manualRef.current = true; predXRef.current = 0.5; predYRef.current = 0.5; }
    predXRef.current = Math.max(0, Math.min(1, predXRef.current + d[0]));
    predYRef.current = Math.max(0, Math.min(1, predYRef.current + d[1]));
    if (reduced()) { step(0.016); draw(STILL_T); }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    fleeRRef.current = fleeRadius;
    fleeGRef.current = fleeGain;
    setROut(String(fleeRadius));
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      dusk: tokRGB(root, "--flock-dusk"),
      glow: tokRGB(root, "--flock-glow"),
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
      predXRef.current = 0.5;
      predYRef.current = 0.42;
      for (let s = 0; s < 40; s++) step(0.033);
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
  }, [birds, fleeRadius, fleeGain]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 32a96 96 0 1 0 96 96a96.11 96.11 0 0 0-96-96m0 176a80 80 0 1 1 80-80a80.09 80.09 0 0 1-80 80" opacity=".2"/><path d="M225.86 102.82c-3.77-13.68-11-26.16-21-36.21c-19.55-19.54-45.9-27.06-71.06-21.24a8 8 0 0 0-4.19 13.2l31 34.4l-11.6 11.6l-34.4-31a8 8 0 0 0-13.2 4.19c-5.82 25.16 1.7 51.51 21.24 71.06c14.36 14.36 33.15 22.06 52.4 22.94l-30 30a44 44 0 1 0 11.31 11.31l30-30c.88 19.25 8.58 38 22.94 52.4c19.55 19.54 45.9 27.06 71.06 21.24a8 8 0 0 0 4.19-13.2l-31-34.4l11.6-11.6l34.4 31a8 8 0 0 0 13.2-4.19c5.31-22.96-.44-46.94-16.79-65.5M120 216a28 28 0 1 1-28-28a28 28 0 0 1 28 28"/></g></svg>
          <span>포인터를 천적으로 — 반경 안 개체는 거리에 반비례한 힘으로 도망치며 무리가 갈라졌다 다시 뭉칩니다. 포인터가 없으면 가상 천적이 스스로 순회합니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>개체 · 도망 반경 <b className={styles.val}>{rOut}</b>px</span>
          <span className={styles.metaDim}>separation · alignment · cohesion · flee</span>
        </div>
      </div>
    </main>
  );
}
