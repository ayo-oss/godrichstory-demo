// PointerStir — vanilla 판(run/308/demo/08-fluid-pointer-stir/index.html) 의 React 포트.
// 이 편 9종의 인터랙션 중심. 실제 포인터든 결정적 리사주 미리보기든 프레임 간 델타를
// 같은 splat() 한 함수로 속도장에 꽂아 넣는다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./PointerStir.module.scss";

export type PointerStirProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };

const N = 40;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

export default function PointerStir({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: PointerStirProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef({ cr: [255, 255, 255], k1: [51, 69, 74], k2: [74, 53, 80] }) as Box<{ cr: number[]; k1: number[]; k2: number[] }>;

  const u = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const u0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

  const seedTRef = useRef(0) as Box<number>;
  const lastRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;
  const lastLRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;
  const rafRef = useRef(0) as Box<number>;

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const rect = field.getBoundingClientRect();
    cv.width = Math.round(rect.width);
    cv.height = Math.round(rect.height);
  }

  function advect(b: 0 | 1 | 2, dt: number): void {
    const src = b === 0 ? u0.current : b === 1 ? v0.current : d0.current;
    const dst = b === 0 ? u.current : b === 1 ? v.current : d.current;
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

  function step(dt: number): void {
    u0.current.set(u.current); v0.current.set(v.current); d0.current.set(d.current);
    advect(0, dt); u0.current.set(u.current);
    advect(1, dt); v0.current.set(v.current);
    advect(2, dt);
    bounds();
    const uu = u.current, vv = v.current, dd = d.current;
    for (let k = 0; k < SIZE; k++) { uu[k] *= 0.992; vv[k] *= 0.992; dd[k] *= 0.986; }
    seedTRef.current += dt;
  }

  function splat(gx: number, gy: number, fx: number, fy: number, amt: number): void {
    const rad = 7;
    const uu = u.current, vv = v.current, dd = d.current;
    for (let j = -rad; j <= rad; j++) {
      for (let i = -rad; i <= rad; i++) {
        const q = (i * i + j * j) / (rad * rad);
        if (q > 1) continue;
        const gi = gx + i, gj = gy + j;
        if (gi < 1 || gi > N || gj < 1 || gj > N) continue;
        const f = Math.exp(-q * 1.8) * amt;
        const idx = IX(gi, gj);
        uu[idx] += fx * f; vv[idx] += fy * f;
        dd[idx] = Math.min(2.4, dd[idx] + f * 0.62);
      }
    }
  }

  function inject(t: number): void {
    const lx = N * 0.5 + Math.sin(t * 1.3) * N * 0.36;
    const ly = N * 0.5 + Math.sin(t * 2.1 + 1.2) * N * 0.30;
    const gx = Math.round(lx), gy = Math.round(ly);
    const last = lastLRef.current;
    if (last) {
      const fx = (lx - last.x) * 5.2, fy = (ly - last.y) * 5.2;
      splat(gx, gy, fx, fy, Math.min(2.6, Math.hypot(fx, fy) * 0.9 + 0.4));
    } else {
      splat(gx, gy, 0, 0, 1.1);
    }
    lastLRef.current = { x: lx, y: ly };
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
        if (q <= 0.02) { px[o] = pal.cr[0]; px[o + 1] = pal.cr[1]; px[o + 2] = pal.cr[2]; px[o + 3] = 255; continue; }
        const a = Math.min(1, q);
        const band = q > 1.1 ? pal.k2 : pal.k1;
        px[o]     = pal.cr[0] + (band[0] - pal.cr[0]) * a;
        px[o + 1] = pal.cr[1] + (band[1] - pal.cr[1]) * a;
        px[o + 2] = pal.cr[2] + (band[2] - pal.cr[2]) * a;
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(): void {
    inject(seedTRef.current);
    step(1 / 30);
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const gx = 1 + Math.round((e.clientX - rect.left) / rect.width * (N - 1));
    const gy = 1 + Math.round((e.clientY - rect.top) / rect.height * (N - 1));
    const last = lastRef.current;
    if (last) {
      const fx = (e.clientX - last.x) * 0.42, fy = (e.clientY - last.y) * 0.42;
      splat(gx, gy, fx, fy, Math.min(2.6, Math.hypot(fx, fy)));
    } else {
      splat(gx, gy, 0, 0, 1.1);
    }
    lastRef.current = { x: e.clientX, y: e.clientY };
    if (reduced()) render();
  }

  function onLeave(): void { lastRef.current = null; }

  function onKey(e: KeyEvt): void {
    const dir: Record<string, number[]> = { ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] };
    const dv = dir[e.key];
    if (!dv) return;
    e.preventDefault();
    splat(N >> 1, N >> 1, dv[0], dv[1], 1.8);
    if (reduced()) render();
  }

  function onResize(): void { fit(); if (reduced()) render(); }

  function hexToRgb(c: string): number[] {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d", { willReadFrequently: true });
    if (!ctxRef.current) return;
    const root = rootRef.current;
    if (root) {
      const css = getComputedStyle(root);
      const pt = css.getPropertyValue("--dye-teal").trim();
      const pp = css.getPropertyValue("--dye-plum").trim();
      const pw = css.getPropertyValue("--dye-paper").trim();
      if (pt && pp && pw) {
        palRef.current = { cr: hexToRgb(pw), k1: hexToRgb(pt), k2: hexToRgb(pp) };
      }
    }
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      if (root) root.classList.add("is-still");
      for (let k = 0; k < 46; k++) { inject(seedTRef.current); step(1 / 30); }
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M100.69,180.7,41.34,121.35a16,16,0,0,1,0-22.63L98.72,41.34a16,16,0,0,1,22.63,0l99.31,99.32a16,16,0,0,1,0,22.62l-57.38,57.38a16,16,0,0,1-22.63,0Z" opacity=".2"/><path d="M228.69,133.66,131.32,36.28a24,24,0,0,0-33.94,0L38.34,95.31a24,24,0,0,0,0,34l97.37,97.37a24,24,0,0,0,33.94,0l59-59A24,24,0,0,0,228.69,133.66Zm-16.97,17L152.68,209.7a8,8,0,0,1-11.31,0L44,112.34a8,8,0,0,1,0-11.32L103.06,42a8,8,0,0,1,11.31,0l97.35,97.35A8,8,0,0,1,211.72,150.63Z"/></g></svg>
          <span>커서가 움직인 만큼 속도장을 밀어냅니다 — 빠르게 휘저을수록 소용돌이가 커집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="포인터 휘젓기 실험판"
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">stir<span className={styles.badgeUnit}>splat</span></b>
        </div>
      </div>
    </main>
  );
}
