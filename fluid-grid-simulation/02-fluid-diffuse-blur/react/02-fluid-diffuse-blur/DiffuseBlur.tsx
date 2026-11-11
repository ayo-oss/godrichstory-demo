// DiffuseBlur — vanilla 판(run/308/demo/02-fluid-diffuse-blur/index.html) 의 React 포트.
// 속도장 없이 밀도(d) 하나만으로 가우스-사이델 완화 6회를 매 걸음 돌려 확산 자체가 움직임의 전부가 되게 한다.
// 격자 필드는 ref 상자 안에서만 산다 — React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DiffuseBlur.module.scss";

export type DiffuseBlurProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; buttons?: number };

const N = 32;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

const ITER = 6;
const DIFF = 0.02;

export default function DiffuseBlur({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: DiffuseBlurProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef(["#8b7f95", "#5c4f66", "#2d2836"]) as Box<string[]>;

  const d = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

  const seedTRef = useRef(0) as Box<number>;
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
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
  }

  function bounds(): void {
    const dd = d.current;
    for (let i = 1; i <= N; i++) {
      dd[IX(i, 0)] = dd[IX(i, 1)] * 0.5; dd[IX(i, N + 1)] = dd[IX(i, N)] * 0.5;
    }
    for (let j = 1; j <= N; j++) {
      dd[IX(0, j)] = dd[IX(1, j)] * 0.5; dd[IX(N + 1, j)] = dd[IX(N, j)] * 0.5;
    }
  }

  function diffuse(dt: number): void {
    const dd = d.current, dd0 = d0.current;
    const a = dt * DIFF * N * N;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          dd[IX(i, j)] = (dd0[IX(i, j)] + a * (dd[IX(i - 1, j)] + dd[IX(i + 1, j)] + dd[IX(i, j - 1)] + dd[IX(i, j + 1)])) / (1 + 4 * a);
        }
      }
      bounds();
    }
  }

  function inject(t: number): void {
    const cx = N * 0.5 + Math.sin(t * 0.55) * N * 0.28;
    const cy = N * 0.5 + Math.cos(t * 0.4) * N * 0.24;
    const r = 2.2;
    const amt = 0.85 + Math.sin(t * 2.3) * 0.15;
    const dd0 = d0.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        const f = Math.exp(-q * 3) * amt;
        dd0[IX(Math.round(cx + i), Math.round(cy + j))] = Math.min(2, dd0[IX(Math.round(cx + i), Math.round(cy + j))] + f);
      }
    }
  }

  function step(dt: number): void {
    d0.current.set(d.current);
    inject(seedTRef.current);
    diffuse(dt);
    const dd = d.current;
    for (let k = 0; k < SIZE; k++) dd[k] *= 0.992;
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
        if (q <= 0.002) { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 255; continue; }
        const band = q > 0.62 ? 2 : q > 0.28 ? 1 : 0;
        const c = pal[band];
        const rr = parseInt(c.slice(1, 3), 16), gg = parseInt(c.slice(3, 5), 16), bb = parseInt(c.slice(5, 7), 16);
        const a = Math.min(1, q);
        px[o] = 255 + (rr - 255) * a; px[o + 1] = 255 + (gg - 255) * a; px[o + 2] = 255 + (bb - 255) * a; px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function frame(): void {
    step(1 / 30);
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  function splat(gx: number, gy: number, amt: number): void {
    const r = 3;
    const dd = d.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        if (gx + i < 1 || gx + i > N || gy + j < 1 || gy + j > N) continue;
        const f = Math.exp(-q * 3) * amt;
        const idx = IX(gx + i, gy + j);
        dd[idx] = Math.min(2.2, dd[idx] + f);
      }
    }
  }

  function pointAt(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const gx = 1 + Math.round((e.clientX - r.left) / r.width * (N - 1));
    const gy = 1 + Math.round((e.clientY - r.top) / r.height * (N - 1));
    splat(gx, gy, 0.9);
    if (reduced()) render();
  }

  function onKey(e: KeyEvt): void {
    const dir = ({ ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] } as Record<string, number[]>)[e.key];
    if (!dir) return;
    e.preventDefault();
    splat((N >> 1) + dir[0], (N >> 1) + dir[1], 1.1);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 144a80 80 0 0 1-160 0c0-72 80-128 80-128s80 56 80 128" opacity=".2"/><path d="M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-105 72-118c16.53 13 72 60.75 72 118a72.08 72.08 0 0 1-72 72m55.89-62.66a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z"/></g></svg>
          <span>매 걸음 이웃 넷과 값을 섞는 확산이 잉크를 종이에 번지게 합니다 — 눌러서 방울을 떨어뜨려 보세요</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="확산 번짐 실험판"
          tabIndex={0}
          onPointerDown={(e: PtrEvt) => pointAt(e)}
          onPointerMove={(e: PtrEvt) => { if ((e.buttons ?? 0) !== 0) pointAt(e); }}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">6<span className={styles.badgeUnit}>완화</span></b>
        </div>
      </div>
    </main>
  );
}
