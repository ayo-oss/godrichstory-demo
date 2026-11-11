// StableAdvect — vanilla 판(run/308/demo/01-fluid-stable-advect/index.html) 의 React 포트.
// 안정 유체(Stable Fluids) semi-Lagrangian 후방 이류. 격자 필드는 ref 상자 안에서만 산다 —
// React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./StableAdvect.module.scss";

export type StableAdvectProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };

const N = 32;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

export default function StableAdvect({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: StableAdvectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef(["#9ac2df", "#b19edb", "#e0a3b8"]) as Box<string[]>;

  const u = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const u0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const seedTRef = useRef(0) as Box<number>;
  const lastRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;
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
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
  }

  function advect(b: "u" | "v" | "d", dt: number): void {
    const src = b === "u" ? u0.current : b === "v" ? v0.current : d0.current;
    const dst = b === "u" ? u.current : b === "v" ? v.current : d.current;
    const uu = u0.current, vv = v0.current;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        let x = i - dt * N * uu[IX(i, j)];
        let y = j - dt * N * vv[IX(i, j)];
        if (x < 0.5) x = 0.5; else if (x > N + 0.5) x = N + 0.5;
        const i0 = x | 0, i1 = i0 + 1;
        if (y < 0.5) y = 0.5; else if (y > N + 0.5) y = N + 0.5;
        const j0 = y | 0, j1 = j0 + 1;
        const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
        dst[IX(i, j)] = s0 * (t0 * src[IX(i0, j0)] + t1 * src[IX(i0, j1)]) +
                        s1 * (t0 * src[IX(i1, j0)] + t1 * src[IX(i1, j1)]);
      }
    }
  }

  function bounds(): void {
    const dd = d.current, uu = u.current, vv = v.current;
    for (let i = 1; i <= N; i++) {
      dd[IX(i, 0)] = dd[IX(i, 1)] * 0.5; dd[IX(i, N + 1)] = dd[IX(i, N)] * 0.5;
      uu[IX(i, 0)] = uu[IX(i, 1)] * 0.5; uu[IX(i, N + 1)] = uu[IX(i, N)] * 0.5;
      vv[IX(i, 0)] = vv[IX(i, 1)] * 0.5; vv[IX(i, N + 1)] = vv[IX(i, N)] * 0.5;
    }
    for (let j = 1; j <= N; j++) {
      dd[IX(0, j)] = dd[IX(1, j)] * 0.5; dd[IX(N + 1, j)] = dd[IX(N, j)] * 0.5;
      uu[IX(0, j)] = uu[IX(1, j)] * 0.5; uu[IX(N + 1, j)] = uu[IX(N, j)] * 0.5;
      vv[IX(0, j)] = vv[IX(1, j)] * 0.5; vv[IX(N + 1, j)] = vv[IX(N, j)] * 0.5;
    }
  }

  function inject(t: number): void {
    const cx = N * 0.5 + Math.sin(t * 0.9) * N * 0.22;
    const cy = N * 0.55 + Math.sin(t * 1.7) * N * 0.16;
    const dx = Math.cos(t * 0.9) * 0.9 * N * 0.22, dy = Math.cos(t * 1.7) * 1.7 * N * 0.16 * 0.35;
    const amp = 42, r = 2.6;
    const u0v = u0.current, v0v = v0.current, d0v = d0.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        const f = Math.exp(-q * 3.2) * amp;
        const idx = IX(Math.round(cx + i), Math.round(cy + j));
        u0v[idx] += dx * f * 0.06;
        v0v[idx] += dy * f * 0.06;
        const hue = (t * 0.22) % 1;
        const amt = Math.exp(-q * 2.2) * 0.9;
        d0v[idx] += amt * (hue < 0.5 ? 1 : 0.55);
      }
    }
  }

  function step(dt: number): void {
    u0.current.set(u.current); v0.current.set(v.current); d0.current.set(d.current);
    inject(seedTRef.current);
    advect("u", dt); u0.current.set(u.current);
    advect("v", dt); v0.current.set(v.current);
    advect("d", dt);
    bounds();
    const dd = d.current;
    for (let k = 0; k < SIZE; k++) dd[k] *= 0.995;
    seedTRef.current += dt;
  }

  function render(): void {
    const ctx = ctxRef.current, cv = cvRef.current;
    if (!ctx || !cv) return;
    const img = ctx.createImageData(cv.width, cv.height);
    const px = img.data;
    const cellW = cv.width / N, cellH = cv.height / N;
    const pal = palRef.current;
    const dd = d.current;
    for (let py = 0; py < cv.height; py++) {
      const gy = Math.min(N - 1, (py / cellH) | 0);
      for (let pxx = 0; pxx < cv.width; pxx++) {
        const gx = Math.min(N - 1, (pxx / cellW) | 0);
        const q = dd[IX(gx + 1, gy + 1)];
        const o = (py * cv.width + pxx) * 4;
        if (q <= 0) { px[o] = 23; px[o + 1] = 20; px[o + 2] = 26; px[o + 3] = 255; continue; }
        const band = q > 0.62 ? 2 : q > 0.3 ? 1 : 0;
        const c = pal[band];
        const rr = parseInt(c.slice(1, 3), 16), gg = parseInt(c.slice(3, 5), 16), bb = parseInt(c.slice(5, 7), 16);
        const a = Math.min(1, q);
        px[o] = 23 + (rr - 23) * a; px[o + 1] = 20 + (gg - 20) * a; px[o + 2] = 26 + (bb - 26) * a; px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(): void {
    step(1 / 30);
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  function splat(gx: number, gy: number, fx: number, fy: number, amt: number): void {
    const r = 3;
    const uu = u.current, vv = v.current, dd = d.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        if (gx + i < 1 || gx + i > N || gy + j < 1 || gy + j > N) continue;
        const f = Math.exp(-q * 3) * amt;
        const idx = IX(gx + i, gy + j);
        uu[idx] += fx * f; vv[idx] += fy * f;
        dd[idx] = Math.min(2.2, dd[idx] + f * 0.7);
      }
    }
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const gx = 1 + Math.round((e.clientX - r.left) / r.width * (N - 1));
    const gy = 1 + Math.round((e.clientY - r.top) / r.height * (N - 1));
    const last = lastRef.current;
    if (last) {
      const fx = (e.clientX - last.x) * 0.14, fy = (e.clientY - last.y) * 0.14;
      splat(gx, gy, fx, fy, Math.min(1.6, Math.hypot(fx, fy)));
    } else {
      splat(gx, gy, 0, 0, 0.8);
    }
    lastRef.current = { x: e.clientX, y: e.clientY };
    if (reduced()) render();
  }

  function onLeave(): void { lastRef.current = null; }

  function onKey(e: KeyEvt): void {
    const dir: Record<string, number[]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const dd2 = dir[e.key];
    if (!dd2) return;
    e.preventDefault();
    splat(N >> 1, N >> 1, dd2[0], dd2[1], 1.2);
    if (reduced()) render();
  }

  function onResize(): void { fit(); if (reduced()) render(); }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d", { willReadFrequently: true });
    if (!ctxRef.current) return;
    const root = rootRef.current;
    if (root) {
      const css = getComputedStyle(root);
      const p0 = css.getPropertyValue("--dye-0").trim();
      const p1 = css.getPropertyValue("--dye-1").trim();
      const p2 = css.getPropertyValue("--dye-2").trim();
      if (p0 && p1 && p2) palRef.current = [p0, p1, p2];
    }
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      if (root) root.classList.add("is-still");
      for (let k = 0; k < 40; k++) step(1 / 30);
      render();
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M237.94 107.19l-89.13-89.13a20 20 0 0 0-28.28 0l-89.13 89.13a20 20 0 0 0 0 28.28l89.13 89.13a20 20 0 0 0 28.28 0l89.13-89.13a20 20 0 0 0 0-28.28ZM167 143.46a8 8 0 0 1-11.4 0L128 115.86l-27.6 27.6a8 8 0 1 1-11.4-11.32l33.2-33.46a8 8 0 0 1 11.4 0l33.2 33.46a8 8 0 0 1 .2 11.32Z" opacity=".2"/><path d="M243.54 101.75L154.4 12.61a28 28 0 0 0-39.66 0L25.6 101.75a28 28 0 0 0 0 39.66l89.14 89.14a28 28 0 0 0 39.66 0l89.14-89.14a28 28 0 0 0 0-39.66Zm-11.4 28.26l-89.13 89.14a12 12 0 0 1-17 0L36.9 130a12 12 0 0 1 0-17L126 23.87a12 12 0 0 1 17 0l89.14 89.14a12 12 0 0 1 0 16.98Zm-64.76-83.75a8 8 0 0 0-11.71 0l-33.65 33.87a4 4 0 0 1-5.71 0L82.49 100.1a8 8 0 1 0-11.4 11.24l33.51 33.9a20 20 0 0 0 28.49 0l33.51-33.9a8 8 0 0 0 .18-12.02Z"/></g></svg>
          <span>각 칸은 물결을 되짚어 이전 값을 가져옵니다 — 커서를 얹으면 흐름이 구부러집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="유체 이류 실험판"
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">32<span className={styles.badgeUnit}>격자</span></b>
        </div>
      </div>
    </main>
  );
}
