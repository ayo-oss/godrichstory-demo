// AttractorOrbit — vanilla 판(run/315/demo/07-flock-attractor-orbit/index.html) 의 React 포트.
// 캔버스 중앙 인력점 하나가 개체들을 방사형 감쇠 인력 + 접선(소용돌이) 힘으로 붙잡아
// 느린 궤도를 돌게 한다. 개체마다 다른 목표 궤도 반경(orbBias)과 잔상 트레일로 화면 넓은
// 영역을 훑는다. 그 위에 표준 군집 3벡터(분리·정렬·결합)를 약하게 얹는다(라이브러리 0).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./AttractorOrbit.module.scss";

export type AttractorOrbitProps = {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;     // 개체 수
  maxSpeed?: number;  // 최대 속도(정규화)
  attract?: number;   // 인력 세기 — 변형 "인력 세기" 축(16 → 40)
  swirl?: number;     // 소용돌이(접선) 힘
  trail?: number;     // 잔상 덮개 알파 — 낮을수록 궤적이 길게 남는다
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Boid = { x: number; y: number; vx: number; vy: number; orbBias: number };
type Colors = { ink: RGB; dusk: RGB; glow: RGB; lilac: RGB; mist: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "궤도 소용돌이 실험판";
const STILL_T = 1.2;
const SPEED_UNIT = 140;
const NEI_R = 26, NEI_R2 = NEI_R * NEI_R, SEP_R = 11;
const W_SEP = 20, W_ALI = 7, W_COH = 4.2;
const ARROW_STEP: Record<string, [number, number]> = {
  ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
};

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

export default function AttractorOrbit({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  count = 220,
  maxSpeed = 1.6,
  attract = 26,
  swirl = 40,
  trail = 0.08,
}: AttractorOrbitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const boidsRef = useRef<Boid[]>([]) as Box<Boid[]>;
  const firstRef = useRef(true) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const reduceRef = useRef(false) as Box<boolean>;
  const [n, setN] = useState(String(count));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function spawn(rand: () => number): Boid {
    const ang = rand() * TAU;
    const rad = 30 + rand() * 260;
    return {
      x: rad * Math.cos(ang),
      y: rad * Math.sin(ang),
      vx: (rand() - 0.5) * 20,
      vy: (rand() - 0.5) * 20,
      orbBias: 0.55 + rand() * 1.65,
    };
  }

  function buildBoids(): void {
    const rand = makePRNG(0x07f10c1);
    const arr: Boid[] = [];
    for (let i = 0; i < count; i++) arr.push(spawn(rand));
    boidsRef.current = arr;
    setN(String(count));
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
    firstRef.current = true;
  }

  function flockForce(idx: number, cx0: number, cy0: number): [number, number] {
    const boids = boidsRef.current;
    const p = boids[idx];
    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, cnt = 0;
    for (let j = 0; j < boids.length; j++) {
      if (j === idx) continue;
      const q = boids[j];
      let dx = q.x - p.x, dy = q.y - p.y;
      if (dx > cx0) dx -= cx0 * 2; else if (dx < -cx0) dx += cx0 * 2;
      if (dy > cy0) dy -= cy0 * 2; else if (dy < -cy0) dy += cy0 * 2;
      const d2 = dx * dx + dy * dy;
      if (d2 > NEI_R2) continue;
      const d = Math.sqrt(d2) || 0.0001;
      if (d < SEP_R) { sepX -= dx / d; sepY -= dy / d; }
      aliX += q.vx; aliY += q.vy;
      cohX += dx; cohY += dy;
      cnt++;
    }
    let fx = sepX * W_SEP, fy = sepY * W_SEP;
    if (cnt > 0) {
      fx += (aliX / cnt - p.vx) * (W_ALI / 10);
      fy += (aliY / cnt - p.vy) * (W_ALI / 10);
      fx += (cohX / cnt) * (W_COH / 40);
      fy += (cohY / cnt) * (W_COH / 40);
    }
    return [fx, fy];
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const boids = boidsRef.current;
    if (!ctx || !col || boids.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    const maxSpdPxs = maxSpeed * SPEED_UNIT;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${col.ink[0]},${col.ink[1]},${col.ink[2]},${firstRef.current ? 1 : trail})`;
    ctx.fillRect(0, 0, W, H);
    firstRef.current = false;

    const cx = W * 0.5, cy = H * 0.5;
    const spinMul = 0.5 + pxRef.current * 1.1;
    const pullMul = 0.5 + pyRef.current * 1.1;

    const skyA = 0.16 + 0.08 * Math.sin(tSec * 0.7);
    ctx.fillStyle = `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},${skyA.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);

    const breathe = 0.86 + 0.14 * Math.sin(tSec * 1.6);
    const R0 = Math.min(W, H) * 0.1 * breathe;
    const RMAX = Math.min(W, H) * 0.46 * breathe;
    const A0 = 0.62 * (0.7 + 0.3 * Math.sin(tSec * 2.1 + 0.4)) * (0.5 + 0.5 * pullMul);
    ctx.globalCompositeOperation = "lighter";
    const LAYERS = 8;
    for (let L = 0; L < LAYERS; L++) {
      const Lt = L / (LAYERS - 1);
      const R = R0 + (RMAX - R0) * Math.pow(Lt, 0.8);
      const a = Math.max(0.02, A0 * Math.pow(R0 / R, 0.9));
      const rg = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R);
      rg.addColorStop(0, `rgba(${col.glow[0]},${col.glow[1]},${col.glow[2]},${a.toFixed(3)})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgba(${col.dusk[0]},${col.dusk[1]},${col.dusk[2]},0.35)`;
    ctx.lineWidth = 1;
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 26 * ring, 26 * ring * 0.62, 0, 0, TAU);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i2 = 0; i2 < boids.length; i2++) {
      const p = boids[i2];
      const dx = p.x, dy = p.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const nx = dx / d, ny = dy / d;
      const orbR = 270 * p.orbBias;
      const decay = Math.exp(-(d * d) / (orbR * orbR));
      const pull = -attract * pullMul * decay;
      const tx = -ny, ty = nx;
      const swirlR = 300 * p.orbBias;
      const sw = swirl * spinMul * (0.58 + 0.42 * Math.exp(-(d * d) / (swirlR * swirlR)));
      const ff = flockForce(i2, cx, cy);
      const ax = nx * pull + tx * sw + ff[0];
      const ay = ny * pull + ty * sw + ff[1];
      p.vx += ax * dt; p.vy += ay * dt;
      const damp = Math.pow(0.94, dt * 60);
      p.vx *= damp; p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxSpdPxs) { p.vx = (p.vx / sp) * maxSpdPxs; p.vy = (p.vy / sp) * maxSpdPxs; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x > cx) p.x -= cx * 2; else if (p.x < -cx) p.x += cx * 2;
      if (p.y > cy) p.y -= cy * 2; else if (p.y < -cy) p.y += cy * 2;

      const fx2 = cx + p.x, fy2 = cy + p.y;
      const mix = Math.min(1, d / 120);
      const rC = col.glow[0] + (col.lilac[0] - col.glow[0]) * mix;
      const gC = col.glow[1] + (col.lilac[1] - col.glow[1]) * mix;
      const bC = col.glow[2] + (col.lilac[2] - col.glow[2]) * mix;
      const rad = 2.1 + 1.1 * (1 - mix);
      ctx.fillStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},0.55)`;
      ctx.fillRect(fx2 - rad, fy2 - rad, rad * 2, rad * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${col.mist[0]},${col.mist[1]},${col.mist[2]},0.9)`;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.4, 0, TAU);
    ctx.fill();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 5.4;
      pxRef.current = 0.5 + 0.36 * Math.sin(ph + 0.3);
      pyRef.current = 0.5 + 0.3 * Math.sin(1.7 * ph + 1.1);
    }
    draw(t, dt);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduceRef.current) draw(STILL_T, 0.016);
  }
  function onPointerLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }
  function onKeyDown(e: { key: string; preventDefault(): void }): void {
    const d = ARROW_STEP[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduceRef.current) draw(STILL_T, 0.016);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    colRef.current = {
      ink: tokRGB(root, "--flock-ink"),
      dusk: tokRGB(root, "--flock-dusk"),
      glow: tokRGB(root, "--flock-glow"),
      lilac: tokRGB(root, "--flock-lilac"),
      mist: tokRGB(root, "--flock-mist"),
    };
    buildBoids();
    fit();
    function onResize(): void {
      fit();
      if (reduceRef.current) draw(STILL_T, 0.016);
    }
    window.addEventListener("resize", onResize);
    if (reduceRef.current) {
      draw(STILL_T, 0);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, maxSpeed, attract, swirl, trail]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="14"><ellipse cx="128" cy="128" rx="96" ry="40" /><ellipse cx="128" cy="128" rx="40" ry="96" transform="rotate(45 128 128)" /></g><circle cx="128" cy="128" r="20" fill="currentColor" /></svg>
          <span>중앙 인력점 하나가 {n}마리를 느린 소용돌이로 붙잡습니다 — 포인터 x 는 회전, y 는 인력 세기</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>마리 · 인력 소용돌이 궤도</span>
          <span className={styles.metaDim}>createRadialGradient · 이웃 3벡터 · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
