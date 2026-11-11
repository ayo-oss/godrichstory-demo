// VoronoiGrow — vanilla 판(run/395/demo/04-canvas-loader-voronoi-cell-grow-seed-count/index.html) 의 React 포트.
// 씨앗점 개수를 진행률에 비례해 늘리고 매 프레임 최근접-씨앗 격자(보로노이)를 다시 계산한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./VoronoiGrow.module.scss";

export type VoronoiGrowProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Seed = { hx: number; hy: number; px: number; py: number; hx0: number; hy0: number; wf: number; wp: number };

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

const MAXSEEDS = 16;
const LOOP = 2.0;
const CELL = 9;
const FIELD_LABEL = "보로노이 셀 성장 실험판";

function makeSeeds(): Seed[] {
  const rng = makeRng(20260924);
  const list: Seed[] = [];
  for (let i = 0; i < MAXSEEDS; i++) {
    list.push({
      hx: 0.08 + rng() * 0.84, hy: 0.1 + rng() * 0.8, px: 0, py: 0, hx0: 0, hy0: 0,
      wf: 0.7 + rng() * 1.1, wp: rng() * Math.PI * 2,   // 개별 흔들림 진동수·위상(LCG 고정) — 씨앗 수가 그대로여도 경계선이 계속 움직인다
    });
  }
  return list;
}

export default function VoronoiGrow({
  duration = "2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#0a4fe8",                          // vanilla $color: $subject-blue-deep
}: VoronoiGrowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cols: 0, rows: 0, wobbleR: 0 }) as Box<{ w: number; h: number; dpr: number; cols: number; rows: number; wobbleR: number }>;
  const seedsRef = useRef<Seed[]>(makeSeeds()) as Box<Seed[]>;
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
    const size = sizeRef.current;
    size.w = r.width; size.h = r.height; size.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    size.cols = Math.ceil(r.width / CELL);
    size.rows = Math.ceil(r.height / CELL);
    size.wobbleR = Math.min(r.width, r.height) * 0.035;
    const seeds = seedsRef.current;
    for (let i = 0; i < MAXSEEDS; i++) { seeds[i].hx0 = seeds[i].hx * r.width; seeds[i].hy0 = seeds[i].hy * r.height; }
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const p = t / LOOP;
    const count = Math.max(2, 2 + Math.floor(p * (MAXSEEDS - 2)));
    const seeds = seedsRef.current;
    const wobbleR = size.wobbleR;
    for (let i = 0; i < MAXSEEDS; i++) {
      seeds[i].px = seeds[i].hx0 + Math.sin(sec * seeds[i].wf + seeds[i].wp) * wobbleR;
      seeds[i].py = seeds[i].hy0 + Math.cos(sec * seeds[i].wf * 0.86 + seeds[i].wp) * wobbleR;
    }

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), SEEDPT = cssv("--seedpt");
    const PALETTE = [cssv("--c1"), cssv("--c2"), cssv("--c3"), cssv("--c4")];

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    for (let r = 0; r < size.rows; r++) {
      const cy = r * CELL + CELL / 2;
      for (let c = 0; c < size.cols; c++) {
        const cx = c * CELL + CELL / 2;
        let best = 0, bestD = Infinity;
        for (let s = 0; s < count; s++) {
          const dx = cx - seeds[s].px, dy = cy - seeds[s].py;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = s; }
        }
        ctx.fillStyle = PALETTE[best % PALETTE.length];
        ctx.globalAlpha = 0.55;
        ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
      }
    }
    ctx.globalAlpha = 1;

    for (let k = 0; k < count; k++) {
      ctx.fillStyle = SEEDPT;
      ctx.beginPath();
      ctx.arc(seeds[k].px, seeds[k].py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const pct = Math.round((count - 2) / (MAXSEEDS - 2) * 100);
    if (pctRef.current) pctRef.current.textContent = pct + "%";
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>시드</span></b>
        </div>
      </div>
    </main>
  );
}
