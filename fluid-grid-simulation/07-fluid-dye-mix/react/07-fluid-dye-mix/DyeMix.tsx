// DyeMix — vanilla 판(run/308/demo/07-fluid-dye-mix/index.html) 의 React 포트.
// 밀도 채널을 하나가 아니라 셋(R,G,B 역할)으로 두고 공유 속도장 위에서 각각 독립 이류·확산한다.
// 겹치는 곳의 중간색은 미리 섞은 색이 아니라 채널 값이 렌더식을 통과한 결과다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DyeMix.module.scss";

export type DyeMixProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number };

const N = 48;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

export default function DyeMix({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#a8c9ab",
}: DyeMixProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef({ cr: [255, 243, 207], k1: [219, 167, 171], k2: [168, 201, 171], k3: [167, 185, 217] }) as Box<{ cr: number[]; k1: number[]; k2: number[]; k3: number[] }>;

  const u = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const u0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const r = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const r0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const g = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const g0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const bC = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const b0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

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
    const rect = field.getBoundingClientRect();
    cv.width = Math.round(rect.width);
    cv.height = Math.round(rect.height);
  }

  function advect(dst: Float32Array, src: Float32Array, dt: number): void {
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

  function diffuse(dst: Float32Array, src: Float32Array, k: number): void {
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j);
        dst[idx] = src[idx] + k * (src[IX(i - 1, j)] + src[IX(i + 1, j)] + src[IX(i, j - 1)] + src[IX(i, j + 1)] - 4 * src[idx]);
      }
    }
  }

  function dyeBounds(d: Float32Array): void {
    for (let i = 1; i <= N; i++) {
      d[IX(i, 0)] = d[IX(i, 1)] * 0.5; d[IX(i, N + 1)] = d[IX(i, N)] * 0.5;
    }
    for (let j = 1; j <= N; j++) {
      d[IX(0, j)] = d[IX(1, j)] * 0.5; d[IX(N + 1, j)] = d[IX(N, j)] * 0.5;
    }
  }

  function velBounds(): void {
    const uu = u.current, vv = v.current;
    for (let i = 1; i <= N; i++) {
      uu[IX(i, 0)] = uu[IX(i, 1)] * 0.5; uu[IX(i, N + 1)] = uu[IX(i, N)] * 0.5;
      vv[IX(i, 0)] = vv[IX(i, 1)] * 0.5; vv[IX(i, N + 1)] = vv[IX(i, N)] * 0.5;
    }
    for (let j = 1; j <= N; j++) {
      uu[IX(0, j)] = uu[IX(1, j)] * 0.5; uu[IX(N + 1, j)] = uu[IX(N, j)] * 0.5;
      vv[IX(0, j)] = vv[IX(1, j)] * 0.5; vv[IX(N + 1, j)] = vv[IX(N, j)] * 0.5;
    }
  }

  function velSource(): void {
    const cx = N * 0.5, cy = N * 0.52;
    const uu = u.current, vv = v.current;
    for (let j = 2; j <= N - 1; j++) {
      for (let i = 2; i <= N - 1; i++) {
        const dx = i - cx, dy = j - cy;
        const q = Math.sqrt(dx * dx + dy * dy) / (N * 0.5);
        const w = Math.exp(-q * q * 2.2) * 0.55;
        uu[IX(i, j)] += (-dy * 0.05 + 0.16) * w;
        vv[IX(i, j)] += (dx * 0.05) * w;
      }
    }
  }

  function splatDye(d: Float32Array, cx: number, cy: number, amp: number): void {
    const rad = 3;
    for (let j = -rad; j <= rad; j++) {
      for (let i = -rad; i <= rad; i++) {
        const q = (i * i + j * j) / (rad * rad);
        if (q > 1) continue;
        const gi = Math.round(cx) + i, gj = Math.round(cy) + j;
        if (gi < 1 || gi > N || gj < 1 || gj > N) continue;
        d[IX(gi, gj)] += Math.exp(-q * 2.4) * amp;
      }
    }
  }

  function inject(t: number): void {
    const ax = N * 0.27 + Math.sin(t * 1.1) * N * 0.09;
    const ay = N * 0.3 + Math.cos(t * 0.9) * N * 0.08;
    const bx = N * 0.7 + Math.sin(t * 0.8 + 2.1) * N * 0.08;
    const by = N * 0.7 + Math.cos(t * 1.3 + 1.4) * N * 0.07;
    const mx = N * 0.5 + Math.sin(t * 0.55 + 4.0) * N * 0.13;
    const my = N * 0.5 + Math.cos(t * 0.62 + 1.0) * N * 0.12;
    splatDye(r0.current, ax, ay, 1.3);
    splatDye(b0.current, bx, by, 1);
    splatDye(g0.current, mx, my, 0.8);
  }

  function step(dt: number): void {
    velSource();
    u0.current.set(u.current); v0.current.set(v.current);
    advect(u.current, u0.current, dt); u0.current.set(u.current);
    advect(v.current, v0.current, dt); v0.current.set(v.current);
    velBounds();

    r0.current.set(r.current); g0.current.set(g.current); b0.current.set(bC.current);
    inject(seedTRef.current);
    diffuse(r.current, r0.current, 0.09); diffuse(g.current, g0.current, 0.09); diffuse(bC.current, b0.current, 0.09);
    r0.current.set(r.current); g0.current.set(g.current); b0.current.set(bC.current);
    advect(r.current, r0.current, dt); advect(g.current, g0.current, dt); advect(bC.current, b0.current, dt);
    dyeBounds(r.current); dyeBounds(g.current); dyeBounds(bC.current);
    const rr = r.current, gg = g.current, bb = bC.current;
    for (let k = 0; k < SIZE; k++) { rr[k] *= 0.996; gg[k] *= 0.996; bb[k] *= 0.996; }
    seedTRef.current += dt;
  }

  function render(): void {
    const ctx = ctxRef.current, cv = cvRef.current;
    if (!ctx || !cv) return;
    const img = ctx.createImageData(cv.width, cv.height);
    const px = img.data;
    const cellW = cv.width / N, cellH = cv.height / N;
    const pal = palRef.current;
    const rr = r.current, gg = g.current, bb = bC.current;
    for (let py = 0; py < cv.height; py++) {
      const gy = Math.min(N - 1, (py / cellH) | 0);
      for (let pxx = 0; pxx < cv.width; pxx++) {
        const gx = Math.min(N - 1, (pxx / cellW) | 0);
        const idx = IX(gx + 1, gy + 1);
        const qr = Math.min(1.6, rr[idx]) / 1.6;
        const qg = Math.min(1.6, gg[idx]) / 1.6;
        const qb = Math.min(1.6, bb[idx]) / 1.6;
        const o = (py * cv.width + pxx) * 4;
        px[o]     = Math.min(255, pal.cr[0] + qr * (pal.k1[0] - pal.cr[0]) + qg * (pal.k2[0] - pal.cr[0]) + qb * (pal.k3[0] - pal.cr[0]));
        px[o + 1] = Math.min(255, pal.cr[1] + qr * (pal.k1[1] - pal.cr[1]) + qg * (pal.k2[1] - pal.cr[1]) + qb * (pal.k3[1] - pal.cr[1]));
        px[o + 2] = Math.min(255, pal.cr[2] + qr * (pal.k1[2] - pal.cr[2]) + qg * (pal.k2[2] - pal.cr[2]) + qb * (pal.k3[2] - pal.cr[2]));
        px[o + 3] = 255;
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
    const rad = 4;
    const uu = u.current, vv = v.current;
    for (let j = -rad; j <= rad; j++) {
      for (let i = -rad; i <= rad; i++) {
        const q = (i * i + j * j) / (rad * rad);
        if (q > 1) continue;
        if (gx + i < 1 || gx + i > N || gy + j < 1 || gy + j > N) continue;
        const f = Math.exp(-q * 3) * amt;
        const idx = IX(gx + i, gy + j);
        uu[idx] += fx * f; vv[idx] += fy * f;
      }
    }
  }

  function onMove(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const gx = 1 + Math.round((e.clientX - rect.left) / rect.width * (N - 1));
    const gy = 1 + Math.round((e.clientY - rect.top) / rect.height * (N - 1));
    const last = lastRef.current;
    if (last) {
      const fx = (e.clientX - last.x) * 0.18, fy = (e.clientY - last.y) * 0.18;
      splat(gx, gy, fx, fy, Math.min(2, Math.hypot(fx, fy)));
    } else {
      splat(gx, gy, 0, 0, 0.9);
    }
    lastRef.current = { x: e.clientX, y: e.clientY };
    if (reduced()) render();
  }

  function onLeave(): void { lastRef.current = null; }

  function onKey(e: KeyEvt): void {
    const dir: Record<string, number[]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const dv = dir[e.key];
    if (!dv) return;
    e.preventDefault();
    splat(N >> 1, N >> 1, dv[0], dv[1], 1.2);
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
      const pr = css.getPropertyValue("--dye-r").trim();
      const pg = css.getPropertyValue("--dye-g").trim();
      const pb = css.getPropertyValue("--dye-b").trim();
      const pp = css.getPropertyValue("--dye-paper").trim();
      if (pr && pg && pb && pp) {
        palRef.current = { cr: hexToRgb(pp), k1: hexToRgb(pr), k2: hexToRgb(pg), k3: hexToRgb(pb) };
      }
    }
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      if (root) root.classList.add("is-still");
      for (let k = 0; k < 44; k++) step(1 / 30);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,184a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,208ZM112,72v56a16,16,0,0,0,32,0V72a16,16,0,0,0-32,0Z" opacity=".2"/><path d="M128,16A112,112,0,1,0,240,128,112.12,112.12,0,0,0,128,16Zm0,192a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,208ZM112,72v56a16,16,0,0,0,32,0V72a16,16,0,0,0-32,0Z"/></g></svg>
          <span>채널 세 개가 각자 흘러 섞입니다 — 커서로 두 색 사이를 저어 보세요</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="염료 혼합 실험판"
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">3<span className={styles.badgeUnit}>채널</span></b>
        </div>
      </div>
    </main>
  );
}
