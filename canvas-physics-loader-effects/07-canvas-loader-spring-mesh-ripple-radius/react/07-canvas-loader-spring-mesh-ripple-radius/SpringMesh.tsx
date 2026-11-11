// SpringMesh — vanilla 판(run/395/demo/07-canvas-loader-spring-mesh-ripple-radius/index.html) 의 React 포트.
// 파동 반경이 중심에서 번지고, 파동이 닿은 격자점마다 감쇠 스프링(닫힌해 SHM)으로 튕겼다가 가라앉는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SpringMesh.module.scss";

export type SpringMeshProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Pt = { px: number; py: number; ux: number; uy: number; dist: number };

const GX = 9, GY = 6;
const STIFFNESS = 9;   // 스프링 강성 상수(훅 대상) — spring-mesh-stiffness, 값이 클수록 빨리 흔들린다
const DAMP = 3.4;
const AMP = 9;
const LOOP = 2.2;
const FIELD_LABEL = "스프링 격자 파동 실험판";

function ripple(dt: number): number {
  if (dt < 0) return 0;
  return AMP * Math.exp(-DAMP * dt) * Math.cos(STIFFNESS * dt);
}

export default function SpringMesh({
  duration = "2.2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",   // vanilla $easing: $ease-pop
  color = "#c93000",                          // vanilla $color: $subject-orange-deep
}: SpringMeshProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, cx: 0, cy: 0, maxR: 0 }) as Box<{ w: number; h: number; dpr: number; cx: number; cy: number; maxR: number }>;
  const ptsRef = useRef<Pt[]>([]) as Box<Pt[]>;
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
    size.maxR = Math.max(size.cx, size.cy) * 1.05 + Math.min(r.width, r.height) * 0.1;

    const mx = r.width * 0.1, my = r.height * 0.14;
    const list: Pt[] = [];
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const px = mx + (r.width - mx * 2) * (gx / (GX - 1));
        const py = my + (r.height - my * 2) * (gy / (GY - 1));
        const dx = px - size.cx, dy = py - size.cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        list.push({ px, py, ux: dx / dist, uy: dy / dist, dist });
      }
    }
    ptsRef.current = list;
  }

  function draw(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const size = sizeRef.current;
    const W = size.w, H = size.h;
    const t = sec % LOOP;
    const p = t / LOOP;
    const frontR = p * size.maxR;
    const speed = size.maxR / LOOP;
    const pts = ptsRef.current;

    const cssv = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const PAPER = cssv("--paper"), LINE = cssv("--line"), NODE = cssv("--node"), NODE_HOT = cssv("--node-hot"), RING = cssv("--ring");

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = RING;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(size.cx, size.cy, Math.max(2, frontR), 0, Math.PI * 2);
    ctx.stroke();

    const disp = new Array(pts.length);
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i];
      const dt = t - q.dist / speed;
      disp[i] = ripple(dt);
    }

    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    for (let gy = 0; gy < GY; gy++) {
      for (let gx = 0; gx < GX; gx++) {
        const idx = gy * GX + gx;
        const q2 = pts[idx];
        const x1 = q2.px + q2.ux * disp[idx];
        const y1 = q2.py + q2.uy * disp[idx];
        if (gx < GX - 1) {
          const idxR = idx + 1;
          const qR = pts[idxR];
          const x2 = qR.px + qR.ux * disp[idxR];
          const y2 = qR.py + qR.uy * disp[idxR];
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
        if (gy < GY - 1) {
          const idxD = idx + GX;
          const qD = pts[idxD];
          const x3 = qD.px + qD.ux * disp[idxD];
          const y3 = qD.py + qD.uy * disp[idxD];
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x3, y3); ctx.stroke();
        }
      }
    }

    for (let k = 0; k < pts.length; k++) {
      const qq = pts[k];
      const x = qq.px + qq.ux * disp[k];
      const y = qq.py + qq.uy * disp[k];
      const heat = Math.min(1, Math.abs(disp[k]) / AMP);
      ctx.fillStyle = heat > 0.18 ? NODE_HOT : NODE;
      ctx.beginPath();
      ctx.arc(x, y, 2.6 + heat * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

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
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={pctRef}>0%</span><span className={styles.badgeUnit}>파동</span></b>
        </div>
      </div>
    </main>
  );
}
