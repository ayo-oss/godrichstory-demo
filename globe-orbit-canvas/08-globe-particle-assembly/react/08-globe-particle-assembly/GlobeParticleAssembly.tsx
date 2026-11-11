// GlobeParticleAssembly — vanilla 판(run/304/demo/08-globe-particle-assembly/index.html) 의 React 포트.
// N 개의 입자가 흩어진 랜덤 시작점에서 피보나치 구 목표점으로 이징 보간(lerp)한다.
// 사이클: 흩어짐(hold) → 모임(ease) → 구 유지(hold, 자전) → 흩어짐(ease) → 반복.
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 미리보기가 없다 — props 는 CSS 변수로 무대 격식에만 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GlobeParticleAssembly.module.scss";

export type GlobeParticleAssemblyProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Particle = { sx: number; sy: number; sz: number; tx: number; ty: number; tz: number; jt: number; sp: number };
type P3 = { x: number; y: number; z: number; jt: number; sp: number };

const TAU = Math.PI * 2;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const N = 260;
const FIELD_LABEL = "입자 조립 지구본";
// 사이클 타임라인(초)
const T_HOLD_OUT = 1.2, T_ASSEMBLE = 2.6, T_HOLD_IN = 2.6, T_DISPERSE = 2.6;
const CYCLE = T_HOLD_OUT + T_ASSEMBLE + T_HOLD_IN + T_DISPERSE;

// 결정적 난수 — mulberry32. 시작 위치가 정해져 있다(같은 그림 재현)
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    const t = Math.imul(a ^ a >>> 15, 1 | a);
    const u = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((u ^ u >>> 14) >>> 0) / 4294967296;
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function phaseOf(clock: number): { k: string; t: number } {
  let c = clock % CYCLE;
  if (c < T_HOLD_OUT) return { k: "out", t: 0 };
  c -= T_HOLD_OUT;
  if (c < T_ASSEMBLE) return { k: "assemble", t: easeInOut(c / T_ASSEMBLE) };
  c -= T_ASSEMBLE;
  if (c < T_HOLD_IN) return { k: "in", t: 1 };
  c -= T_HOLD_IN;
  return { k: "disperse", t: easeInOut(c / T_DISPERSE) };
}

export default function GlobeParticleAssembly({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: GlobeParticleAssemblyProps) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const particlesRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const clockRef = useRef(0) as Box<number>;
  const rotYRef = useRef(0) as Box<number>;
  const lastRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.34;

    const cs = getComputedStyle(root);
    const C_near = cs.getPropertyValue("--pa-near").trim();
    const C_far = cs.getPropertyValue("--pa-far").trim();

    const ph = phaseOf(clockRef.current);
    const t = ph.k === "assemble" ? ph.t : (ph.k === "disperse" ? 1 - ph.t : (ph.k === "in" ? 1 : 0));

    const c = Math.cos(rotYRef.current), s = Math.sin(rotYRef.current);
    const particles = particlesRef.current;

    const order: P3[] = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const lx = p.sx + (p.tx - p.sx) * t;
      const ly = p.sy + (p.ty - p.sy) * t;
      const lz = p.sz + (p.tz - p.sz) * t;
      // 자전은 조립 상태에 가까울수록 의미가 있다 — t 가 클수록 회전 반영 비중을 높인다
      const rx = lx * c + lz * s;
      const rz = -lx * s + lz * c;
      order.push({ x: rx, y: ly, z: rz, jt: p.jt, sp: p.sp });
    }
    order.sort((a, b) => a.z - b.z);

    for (let k = 0; k < order.length; k++) {
      const o = order[k];
      const depth = (o.z + 2.2) / 4.4;
      const px = cx + o.x * R, py = cy - o.y * R;
      const tw = 0.65 + Math.sin(clockRef.current * o.sp + o.jt) * 0.35;
      ctx.globalAlpha = (0.25 + depth * 0.75) * tw;
      const rr = 1.1 + depth * 1.8;
      ctx.fillStyle = depth > 0.55 ? C_near : C_far;
      ctx.beginPath();
      ctx.arc(px, py, rr, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now: number): void {
    const dt = lastRef.current ? Math.min((now - lastRef.current) / 1000, 0.05) : 0.016;
    lastRef.current = now;
    clockRef.current += dt;
    rotYRef.current += dt * 0.22;
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    const rnd = mulberry32(304);
    const particles = particlesRef.current;
    particles.length = 0;
    for (let i = 0; i < N; i++) {
      // 목표 — 피보나치 구 분포
      const y = 1 - 2 * (i + 0.5) / N;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = i * GOLDEN;
      const tx = Math.cos(phi) * rad, ty = y, tz = Math.sin(phi) * rad;
      // 시작 — 화면 전체에 흩어진 랜덤 위치(구 밖 먼 곳, 깊이도 랜덤)
      particles.push({
        sx: (rnd() * 2 - 1) * 2.2, sy: (rnd() * 2 - 1) * 2.2, sz: (rnd() * 2 - 1) * 2.2,
        tx, ty, tz,
        jt: rnd() * TAU, sp: 0.6 + rnd() * 0.8
      });
    }
    fit();
    const onResize = (): void => { fit(); draw(); };
    window.addEventListener("resize", onResize);
    if (reduced()) {
      clockRef.current = T_HOLD_OUT + T_ASSEMBLE + 0.5;   // 정적 프레임 — 조립된 구 상태를 보여준다
      draw();
    } else {
      lastRef.current = 0;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a104 104 0 1 0 104 104A104.12 104.12 0 0 0 128 24" opacity=".2"/><path d="M197.67 186.37a99.2 99.2 0 0 1-11.3 11.3a8 8 0 0 1-10.72-11.87a83.2 83.2 0 0 0 9.48-9.48a8 8 0 1 1 12.54 9.95Zm-27.98 20.2a99.1 99.1 0 0 1-15.4 6.3a8 8 0 0 1-4.9-15.24a83 83 0 0 0 12.9-5.28a8 8 0 0 1 7.4 14.22ZM128 216a88 88 0 1 1 88-88a8 8 0 0 1-16 0a72 72 0 1 0-72 72a8 8 0 0 1 0 16" fillRule="evenodd"/></g></svg>
          <span>흩어진 입자가 페이드로 모여 구를 이루고 다시 흩어집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="img"
          aria-label={FIELD_LABEL}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
      </div>
    </main>
  );
}
