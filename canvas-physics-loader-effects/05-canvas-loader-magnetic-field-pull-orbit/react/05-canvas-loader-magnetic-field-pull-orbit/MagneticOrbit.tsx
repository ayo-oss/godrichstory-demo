// MagneticOrbit — vanilla 판(run/395/demo/05-canvas-loader-magnetic-field-pull-orbit/index.html) 의 React 포트.
// 입자 10개가 코어를 돌며 궤도 반지름이 진행률에 비례해 0 에 가까워진다(훅 고정 — magnetic-field-pull-orbit).
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./MagneticOrbit.module.scss";

export type MagneticOrbitProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Particle = { r0: number; phase: number; speed: number };

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

const N = 10;
const LOOP = 2.4;
const FIELD_LABEL = "자기장 궤도 흡인 실험판";

function makeParticles(): Particle[] {
  const rng = makeRng(20260925);
  const list: Particle[] = [];
  for (let i = 0; i < N; i++) {
    list.push({
      r0: 0.42 + rng() * 0.56,
      phase: rng() * Math.PI * 2,
      speed: (0.55 + rng() * 0.9) * (rng() < 0.5 ? -1 : 1),
    });
  }
  return list;
}

export default function MagneticOrbit({
  duration = "2.4s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#5b8cf8",                          // vanilla $color: $subject-blue-light
}: MagneticOrbitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cx: 0, cy: 0, fieldR: 0 }) as Box<{ w: number; h: number; dpr: number; cx: number; cy: number; fieldR: number }>;
  const partsRef = useRef<Particle[]>(makeParticles()) as Box<Particle[]>;
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
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = sizeRef.current;
    size.w = r.width; size.h = r.height; size.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.cx = r.width * 0.5; size.cy = r.height * 0.5;
    size.fieldR = Math.min(r.width, r.height) * 0.44;
    const root = rootRef.current;
    if (root) {
      const paper = getComputedStyle(root).getPropertyValue("--paper").trim();
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, r.width, r.height);
    }
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const p = t / LOOP;
    const shrink = 1 - p;

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER_FADE = cssv("--paper-fade"), CORE = cssv("--core"), LINE = cssv("--line");
    const PALETTE = [cssv("--p1"), cssv("--p2"), cssv("--p3")];

    ctx.fillStyle = PAPER_FADE;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.6;
    const parts = partsRef.current;
    for (let i = 0; i < N; i++) {
      const q = parts[i];
      const rad = size.fieldR * q.r0 * shrink;
      const ang = q.phase + sec * q.speed;
      const x = size.cx + Math.cos(ang) * rad;
      const y = size.cy + Math.sin(ang) * rad;
      ctx.beginPath();
      ctx.moveTo(size.cx, size.cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(x, y, 6.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const coreR = 8 + (1 - shrink) * 14;
    const grad = ctx.createRadialGradient(size.cx, size.cy, 0, size.cx, size.cy, coreR * 2.2);
    grad.addColorStop(0, CORE);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size.cx, size.cy, coreR * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CORE;
    ctx.beginPath();
    ctx.arc(size.cx, size.cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    if (pctRef.current) pctRef.current.textContent = Math.round(p * 100) + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
  }

  function restart(): void {
    t0Ref.current = performance.now();
    fit();
    draw(0);
  }

  function onKey(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePause(); }
    else if (e.key === "r" || e.key === "R") { e.preventDefault(); restart(); }
  }

  function onClick(): void {
    togglePause();
  }

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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>흡인</span></b>
        </div>
      </div>
    </main>
  );
}
