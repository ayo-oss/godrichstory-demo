// OrbitSweep — vanilla 판(run/395/demo/08-canvas-loader-orbit-satellite-arc-sweep/index.html) 의 React 포트.
// 각도 값 하나가 0~360°를 쓸어가고, 궤도 3개의 위성이 반지름에 반비례하는 배속으로 꼬리를 남긴다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./OrbitSweep.module.scss";

export type OrbitSweepProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Ring = { rf: number; speed: number };

const RINGS: Ring[] = [
  { rf: 0.30, speed: 1.0 },
  { rf: 0.58, speed: 0.62 },
  { rf: 0.86, speed: 0.38 },
];
const LOOP = 3.0;
const TRAIL_SEG = 26;
const TRAIL_SPAN = 1.1;
const FIELD_LABEL = "위성 궤도 각도 스윕 실험판";

export default function OrbitSweep({
  duration = "3s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#0a4fe8",                          // vanilla $color: $subject-blue-deep
}: OrbitSweepProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cx: 0, cy: 0, baseR: 0 }) as Box<{ w: number; h: number; dpr: number; cx: number; cy: number; baseR: number }>;
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
    size.baseR = Math.min(r.width, r.height) * 0.46;
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const p = t / LOOP;
    const sweep = p * Math.PI * 2;

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), ORBIT = cssv("--orbit"), CORE = cssv("--core");
    const COLORS = [cssv("--s1"), cssv("--s2"), cssv("--s3")];

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    const WIDE_SEG = 30, WIDE_SPAN = 1.7;
    for (let w = WIDE_SEG; w >= 0; w--) {
      const wa0 = sweep - WIDE_SPAN * (w / WIDE_SEG);
      const wa1 = sweep - WIDE_SPAN * ((w - 1) / WIDE_SEG);
      const walpha = 1 - w / WIDE_SEG;
      ctx.fillStyle = COLORS[0];
      ctx.globalAlpha = walpha * walpha * 0.14;
      ctx.beginPath();
      ctx.moveTo(size.cx, size.cy);
      ctx.arc(size.cx, size.cy, size.baseR, wa0, wa1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < RINGS.length; i++) {
      const ring = RINGS[i];
      const rad = size.baseR * ring.rf;
      ctx.strokeStyle = ORBIT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(size.cx, size.cy, rad, 0, Math.PI * 2);
      ctx.stroke();

      const ang = sweep * ring.speed;
      for (let s = TRAIL_SEG; s >= 0; s--) {
        const a0 = ang - TRAIL_SPAN * (s / TRAIL_SEG);
        const a1 = ang - TRAIL_SPAN * ((s - 1) / TRAIL_SEG);
        const alpha = 1 - s / TRAIL_SEG;
        ctx.strokeStyle = COLORS[i];
        ctx.globalAlpha = alpha * alpha * 0.85;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(size.cx, size.cy, rad, a0, a1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const sx = size.cx + Math.cos(ang) * rad;
      const sy = size.cy + Math.sin(ang) * rad;
      ctx.fillStyle = COLORS[i];
      ctx.beginPath();
      ctx.arc(sx, sy, 4.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = CORE;
    ctx.beginPath();
    ctx.arc(size.cx, size.cy, 7, 0, Math.PI * 2);
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>궤도</span></b>
        </div>
      </div>
    </main>
  );
}
