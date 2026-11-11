// GravityDrop — vanilla 판(run/395/demo/03-canvas-loader-gravity-drop-stack-height/index.html) 의 React 포트.
// 블록 8개를 하나씩 떨어뜨려 감쇠 상수(0.92, 훅 고정)로 튕김을 줄이며 쌓는다. 쌓인 블록 수가 진행률.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GravityDrop.module.scss";

export type GravityDropProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type BlockState = "waiting" | "falling" | "settled";
type BlockT = { y: number; vy: number; state: BlockState };

const BLOCKS = 8;
const GRAVITY = 1700;
const DAMPING = 0.92;               // 튕김 감쇠 상수(훅 고정값) — gravity-bounce-damping
const DROP_INTERVAL = 0.3;
const REST_V = 40;
const LOOP = BLOCKS * DROP_INTERVAL + 0.5;
const FIELD_LABEL = "중력 블록 쌓기 실험판";

export default function GravityDrop({
  duration = "2.9s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",     // vanilla $easing: $ease-pop
  color = "#c93000",                           // vanilla $color: $subject-orange-deep
}: GravityDropProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, blockH: 0, blockW: 0, margin: 0 }) as Box<{ w: number; h: number; dpr: number; blockH: number; blockW: number; margin: number }>;
  const blocksRef = useRef<BlockT[]>([]) as Box<BlockT[]>;
  const timeRef = useRef({ last: null as number | null, cycle: -1 }) as Box<{ last: number | null; cycle: number }>;
  const pausedRef = useRef(false) as Box<boolean>;
  const t0Ref = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function resetBlocks(): void {
    const blockH = sizeRef.current.blockH;
    const list: BlockT[] = [];
    for (let i = 0; i < BLOCKS; i++) list.push({ y: -blockH, vy: 0, state: "waiting" });
    blocksRef.current = list;
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
    size.blockH = (r.height - 10) / (BLOCKS + 1.4);
    size.blockW = Math.min(r.width * 0.42, size.blockH * 2.6);
    size.margin = (r.height - 10) - BLOCKS * size.blockH;
    resetBlocks();
  }

  function step(sec: number): number {
    const time = timeRef.current;
    if (time.last === null) time.last = sec;
    const dt = Math.min(0.05, Math.max(0, sec - time.last));
    time.last = sec;
    const ci = Math.floor(sec / LOOP);
    if (ci !== time.cycle) { resetBlocks(); time.cycle = ci; }
    const t = sec - ci * LOOP;
    const size = sizeRef.current;
    const list = blocksRef.current;
    let settled = 0;
    for (let i = 0; i < BLOCKS; i++) {
      const b = list[i];
      if (b.state === "waiting") {
        if (t >= i * DROP_INTERVAL) { b.state = "falling"; b.y = -size.blockH; b.vy = 0; }
      }
      if (b.state === "falling") {
        b.vy += GRAVITY * dt;
        b.y += b.vy * dt;
        const floorY = (size.h - size.margin) - (i + 1) * size.blockH;
        if (b.y >= floorY) {
          b.y = floorY;
          b.vy = -b.vy * DAMPING;
          if (Math.abs(b.vy) < REST_V) { b.state = "settled"; b.vy = 0; }
        }
      }
      if (b.state === "settled") settled++;
    }
    return settled;
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const settled = step(sec);
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), FLOOR = cssv("--floor");
    const PALETTE = [cssv("--c1"), cssv("--c2"), cssv("--c3"), cssv("--c4")];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = FLOOR;
    ctx.fillRect(0, H - size.margin, W, size.margin);

    const cx = W * 0.5;
    const r = 6;
    const list = blocksRef.current;
    for (let i = 0; i < BLOCKS; i++) {
      const b = list[i];
      if (b.state === "waiting") continue;
      const x = cx - size.blockW / 2;
      const y = b.y;
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + size.blockW, y, x + size.blockW, y + size.blockH, r);
      ctx.arcTo(x + size.blockW, y + size.blockH, x, y + size.blockH, r);
      ctx.arcTo(x, y + size.blockH, x, y, r);
      ctx.arcTo(x, y, x + size.blockW, y, r);
      ctx.closePath();
      ctx.fill();
    }

    const pct = Math.round(settled / BLOCKS * 100);
    if (pctRef.current) pctRef.current.textContent = pct + "%";
  }

  function togglePause(): void {
    pausedRef.current = !pausedRef.current;
    const root = rootRef.current;
    if (root) root.classList.toggle("is-paused", pausedRef.current);
  }

  function restart(): void {
    t0Ref.current = performance.now();
    timeRef.current.last = null;
    timeRef.current.cycle = -1;
    resetBlocks();
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>적재</span></b>
        </div>
      </div>
    </main>
  );
}
