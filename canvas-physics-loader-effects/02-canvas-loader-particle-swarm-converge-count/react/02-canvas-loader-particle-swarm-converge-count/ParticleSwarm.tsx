// ParticleSwarm — vanilla 판(run/395/demo/02-canvas-loader-particle-swarm-converge-count/index.html) 의 React 포트.
// 흩어진 입자 중 중심에 도착한 개수/전체 개수가 진행률이다. 시작 위치·도착 순서는 고정 시드 LCG.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ParticleSwarm.module.scss";

export type ParticleSwarmProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Particle = { hx: number; hy: number; px: number; py: number; rank: number; jf: number; jp: number };

const N = 42;
const LOOP = 1.9;
const FIELD_LABEL = "입자 군집 수렴 실험판";

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };
}

function makeParticles(): Particle[] {
  const rng = makeRng(20260923);
  const order: number[] = [];
  for (let i = 0; i < N; i++) order.push(i);
  for (let j = N - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    const tmp = order[j]; order[j] = order[k]; order[k] = tmp;
  }
  const list: Particle[] = [];
  for (let i = 0; i < N; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = 0.34 + rng() * 0.62;
    list.push({
      hx: 0.5 + Math.cos(ang) * rad * 0.5,
      hy: 0.5 + Math.sin(ang) * rad * 0.5,
      px: 0, py: 0,
      rank: order[i],
      jf: 0.6 + rng() * 1.1,
      jp: rng() * Math.PI * 2,
    });
  }
  return list;
}

export default function ParticleSwarm({
  duration = "1.9s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",                           // vanilla $color: $subject-lilac
}: ParticleSwarmProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, inited: false }) as Box<{ w: number; h: number; dpr: number; inited: boolean }>;
  const particlesRef = useRef(makeParticles()) as Box<Particle[]>;
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
    if (!size.inited) {
      const list = particlesRef.current;
      for (let i = 0; i < N; i++) { list[i].px = list[i].hx * r.width; list[i].py = list[i].hy * r.height; }
      size.inited = true;
    }
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER_FADE = cssv("--paper-fade"), DOT = cssv("--dot"), CORE = cssv("--core"), LINE = cssv("--line");

    // 완전히 지우지 않고 옅은 판 색을 덧칠한다 — 입자 궤적 잔상이 남는다
    ctx.fillStyle = PAPER_FADE;
    ctx.fillRect(0, 0, W, H);

    const t = sec % LOOP;
    const p = t / LOOP;
    const arrived = Math.floor(p * N);
    const cx = W * 0.5, cy = H * 0.5;
    const list = particlesRef.current;

    for (let i = 0; i < N; i++) {
      const q = list[i];
      let tx: number, ty: number;
      if (q.rank < arrived) {
        const orbit = 5 + 3 * Math.sin(sec * q.jf + q.jp);
        tx = cx + Math.cos(sec * 1.4 + q.jp) * orbit;
        ty = cy + Math.sin(sec * 1.4 + q.jp) * orbit;
      } else {
        tx = q.hx * W + Math.sin(sec * q.jf + q.jp) * 4;
        ty = q.hy * H + Math.cos(sec * q.jf * 0.8 + q.jp) * 4;
      }
      q.px += (tx - q.px) * 0.14;
      q.py += (ty - q.py) * 0.14;
    }

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let j = 0; j < N; j++) {
      const qj = list[j];
      if (qj.rank < arrived) { ctx.moveTo(qj.px, qj.py); ctx.lineTo(cx, cy); }
    }
    ctx.stroke();

    const frac = arrived / N;
    const coreR = 10 + frac * 22;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.8);
    glow.addColorStop(0, CORE);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.35 + frac * 0.5;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = CORE;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();

    for (let k = 0; k < N; k++) {
      const qk = list[k];
      ctx.fillStyle = qk.rank < arrived ? CORE : DOT;
      ctx.beginPath();
      ctx.arc(qk.px, qk.py, qk.rank < arrived ? 4 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const pct = Math.round(frac * 100);
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
    const root0 = rootRef.current;
    if (root0) {
      const paper = getComputedStyle(root0).getPropertyValue("--paper").trim();
      ctxRef.current.fillStyle = paper;
      ctxRef.current.fillRect(0, 0, sizeRef.current.w, sizeRef.current.h);
    }
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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>수렴</span></b>
        </div>
      </div>
    </main>
  );
}
