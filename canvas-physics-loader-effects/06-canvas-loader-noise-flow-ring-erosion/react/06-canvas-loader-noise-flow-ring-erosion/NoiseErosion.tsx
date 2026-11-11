// NoiseErosion — vanilla 판(run/395/demo/06-canvas-loader-noise-flow-ring-erosion/index.html) 의 React 포트.
// 두 옥타브 값-노이즈(LCG 격자점 보간)가 각도를 따라 흐르고, 그 값에 진행률을 곱해 링의 바깥 경계를 갉아먹는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./NoiseErosion.module.scss";

export type NoiseErosionProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

const LATTICE_N = 24;
const LOOP = 2.6;
const SAMPLES = 96;
const FIELD_LABEL = "노이즈 링 침식 실험판";

function makeLattice(): number[] {
  const rng = makeRng(20260926);
  const list: number[] = [];
  for (let i = 0; i < LATTICE_N; i++) list.push(rng());
  return list;
}

function smooth(f: number): number {
  return f * f * (3 - 2 * f);
}

export default function NoiseErosion({
  duration = "2.6s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#0a4fe8",                          // vanilla $color: $subject-blue-deep
}: NoiseErosionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cx: 0, cy: 0, outerR: 0, innerR: 0, maxErode: 0 }) as Box<{ w: number; h: number; dpr: number; cx: number; cy: number; outerR: number; innerR: number; maxErode: number }>;
  const latticeRef = useRef<number[]>(makeLattice()) as Box<number[]>;
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function valueNoise(x: number): number {
    const lattice = latticeRef.current;
    const xi = ((x % LATTICE_N) + LATTICE_N) % LATTICE_N;
    const i0 = Math.floor(xi);
    const i1 = (i0 + 1) % LATTICE_N;
    const f = smooth(xi - i0);
    return lattice[i0] * (1 - f) + lattice[i1] * f;
  }

  function fieldNoise(theta: number, sec: number): number {
    const x1 = (theta / (Math.PI * 2)) * LATTICE_N + sec * 1.6;
    const x2 = (theta / (Math.PI * 2)) * LATTICE_N * 2.3 + 40 - sec * 2.4;
    return valueNoise(x1) * 0.68 + valueNoise(x2) * 0.32;
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
    size.outerR = Math.min(r.width, r.height) * 0.42;
    size.innerR = size.outerR * 0.52;
    size.maxErode = size.outerR - size.innerR;
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const p = t / LOOP;

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), RING = cssv("--ring"), RING_EDGE = cssv("--ring-edge"), INNER = cssv("--inner");

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const theta = (i / SAMPLES) * Math.PI * 2;
      const n = fieldNoise(theta, sec);
      const r = size.outerR - p * size.maxErode * n;
      const x = size.cx + Math.cos(theta) * r;
      const y = size.cy + Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.moveTo(size.cx + size.innerR, size.cy);
    ctx.arc(size.cx, size.cy, size.innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = RING;
    ctx.fill("evenodd");

    ctx.beginPath();
    for (let j = 0; j <= SAMPLES; j++) {
      const th = (j / SAMPLES) * Math.PI * 2;
      const nn = fieldNoise(th, sec);
      const rr = size.outerR - p * size.maxErode * nn;
      const xx = size.cx + Math.cos(th) * rr;
      const yy = size.cy + Math.sin(th) * rr;
      if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath();
    ctx.strokeStyle = RING_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = INNER;
    ctx.beginPath();
    ctx.arc(size.cx, size.cy, size.innerR * 0.86, 0, Math.PI * 2);
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>침식</span></b>
        </div>
      </div>
    </main>
  );
}
