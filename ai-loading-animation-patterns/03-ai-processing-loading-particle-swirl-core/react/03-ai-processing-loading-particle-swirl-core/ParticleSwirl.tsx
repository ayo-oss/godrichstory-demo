// ParticleSwirl — vanilla 판(run/403/demo/03-ai-processing-loading-particle-swirl-core/index.html) 의 React 포트.
// 입자마다 자신만의 궤도 반경 값을 갖고, 처리 진행 값이 오를수록 AI_LOADER_ORBIT_SHRINK_EASE 이징으로
// 그 반경이 함께 줄어 코어 쪽으로 모여든다. 캔버스 rAF 전용 — @keyframes 없음.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ParticleSwirl.module.scss";

export type ParticleSwirlProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Particle = { baseAngle: number; jitter: number; speed: number; size: number };

const LOOP = 2.0;
const N = 26;
const GOLDEN = 137.508 * Math.PI / 180;
const CORE_R = 14;
const MAX_R = 128;
const AI_LOADER_ORBIT_SHRINK_EASE = 2.2;
const FIELD_LABEL = "입자 소용돌이 코어 수렴 실험판";

function seeded(i: number): number {
  const v = Math.sin(i * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

const PARTICLES: Particle[] = (() => {
  const arr: Particle[] = [];
  for (let i = 0; i < N; i++) {
    arr.push({
      baseAngle: i * GOLDEN,
      jitter: 0.7 + seeded(i) * 0.5,
      speed: 0.55 + seeded(i + 31) * 0.5,
      size: 4.2 + seeded(i + 71) * 3.4,
    });
  }
  return arr;
})();

export default function ParticleSwirl({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: ParticleSwirlProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<{ w: number; h: number; dpr: number }>;
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    sizeRef.current.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const pctEl = pctRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const TRAIL = cssv("--trail"), CORE = cssv("--core"), DOT = cssv("--dot"), DOT_DEEP = cssv("--dot-deep");

    ctx.fillStyle = TRAIL;
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const p = (sec % LOOP) / LOOP;
    const shrink = Math.pow(p, 1 / AI_LOADER_ORBIT_SHRINK_EASE);

    for (let i = 0; i < PARTICLES.length; i++) {
      const q = PARTICLES[i];
      const angle = q.baseAngle + sec * q.speed;
      const r = CORE_R + (MAX_R - CORE_R) * (1 - shrink) * q.jitter;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle) * 0.86;
      ctx.beginPath();
      ctx.arc(x, y, q.size, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? DOT : DOT_DEEP;
      ctx.shadowColor = DOT;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const coreR = CORE_R * (0.85 + 0.3 * (1 - shrink));
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = CORE;
    ctx.fill();

    if (pctEl) pctEl.textContent = Math.round(p * 100) + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
  }
  function restart(): void { t0Ref.current = performance.now(); draw(0); }
  function onKey(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
  }
  function onClick(): void { togglePause(); }
  function onResize(): void {
    fit();
    if (pausedRef.current || reduced()) draw((performance.now() - t0Ref.current) / 1000);
  }
  function frame(now: number): void {
    if (!pausedRef.current) draw((now - t0Ref.current) / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    t0Ref.current = performance.now();
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const root = rootRef.current;
      if (root) root.classList.add("is-still");
      draw(LOOP * 0.62);
    } else {
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M232 56v56a8 8 0 0 1-16 0V91.3l-25.6 25.7A80 80 0 1 1 174 60a8 8 0 1 1-9 13.2A64 64 0 1 0 179.7 128H216a8 8 0 0 1 0 16h-56a8 8 0 0 1-8-8V80a8 8 0 0 1 16 0v20.7L192.7 76A80.1 80.1 0 0 0 64 128a8 8 0 0 1-16 0a96 96 0 0 1 163.6-68.3L224 71.3V56a8 8 0 0 1 8 8" opacity=".2"/><path d="M224 48a8 8 0 0 0-8 8v15.3l-11.7-11.6a96 96 0 1 0 27.6 51.6a8 8 0 0 0-15.8 2.5a80 80 0 1 1-23-43l-25.7 25.7A8 8 0 0 0 173 112h56a8 8 0 0 0 8-8V56a8 8 0 0 0-13-8"/></g></svg>
          <span>클릭하거나 스페이스바를 누르면 멈추거나 다시 갑니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>진행</span></b>
        </div>
      </div>
    </main>
  );
}
