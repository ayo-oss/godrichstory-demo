// NeuralPulse — vanilla 판(run/403/demo/04-ai-processing-loading-neural-node-pulse/index.html) 의 React 포트.
// 각 선마다 다른 지연(delay) 값을 줘 빛 신호가 마디에서 마디로 순서대로 건너가듯 퍼진다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./NeuralPulse.module.scss";

export type NeuralPulseProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Node = { r: number; c: number; delay: number };
type Edge = { a: number; b: number; delay: number };

const LOOP = 2.0;
const COLS = 4, ROWS = 3;
const STEP = 0.22;
const EDGE_MS = 0.34;
const PULSE_W = 0.30;
const FIELD_LABEL = "신경망 마디 펄스 실험판";

function seeded(i: number): number { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); }
function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
function idx(r: number, c: number): number { return r * COLS + c; }

const NODES: Node[] = (() => {
  const arr: Node[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const dist = r + c;
      arr.push({ r, c, delay: dist * STEP + seeded(r * COLS + c) * 0.04 });
    }
  }
  return arr;
})();

const EDGES: Edge[] = (() => {
  const arr: Edge[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c < COLS - 1) arr.push({ a: idx(r, c), b: idx(r, c + 1), delay: 0 });
      if (r < ROWS - 1) arr.push({ a: idx(r, c), b: idx(r + 1, c), delay: 0 });
    }
  }
  for (const ed of arr) {
    ed.delay = Math.min(NODES[ed.a].delay, NODES[ed.b].delay);
  }
  return arr;
})();

let MAX_DELAY = 0;
for (const n of NODES) if (n.delay > MAX_DELAY) MAX_DELAY = n.delay;

export default function NeuralPulse({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
}: NeuralPulseProps) {
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

  function pos(n: Node): { x: number; y: number } {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const padX = W * 0.14, padY = H * 0.18;
    return {
      x: padX + (W - padX * 2) * (n.c / (COLS - 1)),
      y: padY + (H - padY * 2) * (n.r / (ROWS - 1)),
    };
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const pctEl = pctRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), LINE_DIM = cssv("--line-dim"), LINE_LIT = cssv("--line-lit");
    const NODE_DIM = cssv("--node-dim"), NODE_LIT = cssv("--node-lit");

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    const t = sec % LOOP;

    for (const ed of EDGES) {
      const pa = pos(NODES[ed.a]), pb = pos(NODES[ed.b]);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = LINE_DIM;
      ctx.lineWidth = 2;
      ctx.stroke();

      const local = t - ed.delay;
      if (local > 0) {
        const frac = clamp01(local / EDGE_MS);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pa.x + (pb.x - pa.x) * frac, pa.y + (pb.y - pa.y) * frac);
        ctx.strokeStyle = LINE_LIT;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    for (const n of NODES) {
      const p = pos(n);
      const localN = t - n.delay;
      let glow = 0;
      if (localN >= 0) {
        glow = localN < PULSE_W ? (localN / PULSE_W) : Math.max(0.32, 1 - (localN - PULSE_W) / 0.7);
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 + glow * 5, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0 ? NODE_LIT : NODE_DIM;
      if (glow > 0) { ctx.shadowColor = NODE_LIT; ctx.shadowBlur = 14 * glow; }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (pctEl) pctEl.textContent = Math.round(clamp01(t / (MAX_DELAY + EDGE_MS)) * 100) + "%";
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>전파</span></b>
        </div>
      </div>
    </main>
  );
}
