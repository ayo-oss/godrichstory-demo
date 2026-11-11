// CellAutomaton — vanilla 판(run/395/demo/09-canvas-loader-cellular-automaton-fill-percent/index.html) 의 React 포트.
// 씨앗 몇 개에서 시작해 "이웃 3개 이상이면 태어나고, 한 번 살면 계속 산다"는 생존 규칙 하나로
// 세대를 진행시킨다. 그 세대의 살아있는 칸 비율(채워진 칸/전체 칸)이 곧 진행률이다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CellAutomaton.module.scss";

export type CellAutomatonProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

function makeRng(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

const GX = 26, GY = 16;
const TOTAL = GX * GY;
const BIRTH = 3;              // 생존(탄생) 규칙 상수(훅 고정값) — cellular-automaton-fill-percent, 이웃 수가 이 이상이면 태어난다
const INIT_SEEDS = 5;
const GENS = 16;
const STEP_INTERVAL = 0.15;
const LOOP = GENS * STEP_INTERVAL;
const FIELD_LABEL = "셀룰러 오토마타 채움 실험판";

function setAlive(g: Uint8Array, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= GX || y >= GY) return;
  g[y * GX + x] = 1;
}
function makeSeedGrid(): Uint8Array {
  const rng = makeRng(20260927);
  const g = new Uint8Array(TOTAL);
  for (let i = 0; i < INIT_SEEDS; i++) {
    const x = Math.floor(rng() * GX), y = Math.floor(rng() * GY);
    // 씨앗마다 L자 3칸 뭉치 — 홀로 떨어진 1칸은 이웃 3개 조건을 영영 못 채워 자라지 않는다
    setAlive(g, x, y);
    setAlive(g, x + 1, y);
    setAlive(g, x, y + 1);
  }
  return g;
}
function neighborCount(g: Uint8Array, x: number, y: number): number {
  let c = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GX || ny >= GY) continue;
      if (g[ny * GX + nx]) c++;
    }
  }
  return c;
}
function stepGen(prev: Uint8Array): Uint8Array {
  const next = new Uint8Array(TOTAL);
  for (let y = 0; y < GY; y++) {
    for (let x = 0; x < GX; x++) {
      const idx = y * GX + x;
      if (prev[idx]) { next[idx] = 1; continue; }
      next[idx] = neighborCount(prev, x, y) >= BIRTH ? 1 : 0;
    }
  }
  return next;
}
function makeGenerations(): Uint8Array[] {
  const gens = [makeSeedGrid()];
  for (let gi = 1; gi <= GENS; gi++) gens.push(stepGen(gens[gi - 1]));
  return gens;
}
function makeShimmer(): { f: Float32Array; p: Float32Array } {
  const rng = makeRng(778899);
  const f = new Float32Array(TOTAL), p = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) { f[i] = 1.4 + rng() * 2.2; p[i] = rng() * Math.PI * 2; }
  return { f, p };
}

export default function CellAutomaton({
  duration = "2.4s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#7de0c2",                          // vanilla $color: $subject-mint
}: CellAutomatonProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cw: 0, ch: 0 }) as Box<{ w: number; h: number; dpr: number; cw: number; ch: number }>;
  const gensRef = useRef<Uint8Array[]>([]) as Box<Uint8Array[]>;
  const shimRef = useRef<{ f: Float32Array; p: Float32Array } | null>(null) as Box<{ f: Float32Array; p: Float32Array } | null>;
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
    size.cw = r.width / GX; size.ch = r.height / GY;
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    const shim = shimRef.current;
    if (!ctx || !root || !shim) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const gen = Math.min(GENS, Math.floor(t / STEP_INTERVAL));
    const grid = gensRef.current[gen];

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), CELL1 = cssv("--cell1"), CELL2 = cssv("--cell2");

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    let alive = 0;
    for (let y = 0; y < GY; y++) {
      for (let x = 0; x < GX; x++) {
        const idx = y * GX + x;
        if (!grid[idx]) continue;
        alive++;
        const s = 0.58 + 0.42 * Math.sin(sec * shim.f[idx] + shim.p[idx]);
        ctx.fillStyle = idx % 2 === 0 ? CELL1 : CELL2;
        ctx.globalAlpha = s;
        ctx.fillRect(x * size.cw + 1, y * size.ch + 1, size.cw - 2, size.ch - 2);
      }
    }
    ctx.globalAlpha = 1;

    if (pctRef.current) pctRef.current.textContent = Math.round((alive / TOTAL) * 100) + "%";
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
    gensRef.current = makeGenerations();
    shimRef.current = makeShimmer();
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>채움</span></b>
        </div>
      </div>
    </main>
  );
}
