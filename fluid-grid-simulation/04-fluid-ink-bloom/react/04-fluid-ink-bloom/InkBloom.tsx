// InkBloom — vanilla 판(run/308/demo/04-fluid-ink-bloom/index.html) 의 React 포트.
// 클릭한 자리에 밀도 한 덩어리를 심고 확산은 낮게·이류만 남겨 종이 위 잉크 번짐을 흉내낸다.
// 격자 필드는 ref 상자 안에서만 산다 — React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./InkBloom.module.scss";

export type InkBloomProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; pressure?: number; buttons?: number };

const N = 32;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

const SEED_SPOTS = [
  { x: N * 0.32, y: N * 0.38 },
  { x: N * 0.68, y: N * 0.56 },
  { x: N * 0.46, y: N * 0.74 },
];
const SEED_PERIOD = 60;

export default function InkBloom({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: InkBloomProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef(["#cdc8d6", "#8f89a3", "#3a3550"]) as Box<string[]>;

  const u = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const u0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

  const seedTRef = useRef(0) as Box<number>;
  const stepCountRef = useRef(0) as Box<number>;
  const lastSeedStepRef = useRef(-999) as Box<number>;
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

  function diffuse(b: "u" | "v" | "d", k: number, dt: number): void {
    const src = b === "u" ? u.current : b === "v" ? v.current : d.current;
    const a = dt * k * N * N;
    for (let iter = 0; iter < 2; iter++) {
      for (let j = 1; j <= N; j++) {
        for (let i = 1; i <= N; i++) {
          const idx = IX(i, j);
          src[idx] = (src[idx] + a * (src[IX(i - 1, j)] + src[IX(i + 1, j)] + src[IX(i, j - 1)] + src[IX(i, j + 1)])) / (1 + 4 * a);
        }
      }
    }
  }

  function bounds(): void {
    const dd = d.current, uu = u.current, vv = v.current;
    for (let i = 1; i <= N; i++) {
      dd[IX(i, 0)] = dd[IX(i, 1)] * 0.5; dd[IX(i, N + 1)] = dd[IX(i, N)] * 0.5;
      uu[IX(i, 0)] = uu[IX(i, 1)] * 0.4; uu[IX(i, N + 1)] = uu[IX(i, N)] * 0.4;
      vv[IX(i, 0)] = vv[IX(i, 1)] * 0.4; vv[IX(i, N + 1)] = vv[IX(i, N)] * 0.4;
    }
    for (let j = 1; j <= N; j++) {
      dd[IX(0, j)] = dd[IX(1, j)] * 0.5; dd[IX(N + 1, j)] = dd[IX(N, j)] * 0.5;
      uu[IX(0, j)] = uu[IX(1, j)] * 0.4; uu[IX(N + 1, j)] = uu[IX(N, j)] * 0.4;
      vv[IX(0, j)] = vv[IX(1, j)] * 0.4; vv[IX(N + 1, j)] = vv[IX(N, j)] * 0.4;
    }
  }

  function bloom(gx: number, gy: number, amp: number, jitter: number): void {
    const r = 3.6;
    const uu = u.current, vv = v.current, dd = d.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        const f = Math.exp(-q * 2.4) * amp;
        const ix = Math.round(gx + i), iy = Math.round(gy + j);
        if (ix < 1 || ix > N || iy < 1 || iy > N) continue;
        const idx = IX(ix, iy);
        dd[idx] = Math.min(2.4, dd[idx] + f);
        const len = Math.sqrt(i * i + j * j) || 1;
        const nx = i / len, ny = j / len;
        const wob = Math.sin(iy * 1.7 + ix * 0.6 + jitter) * 0.4;
        uu[idx] += (nx + wob) * f * 0.045;
        vv[idx] += (ny - wob) * f * 0.045;
      }
    }
  }

  function step(dt: number): void {
    const uu = u.current, vv = v.current, dd = d.current;
    if (stepCountRef.current - lastSeedStepRef.current >= SEED_PERIOD) {
      const spot = SEED_SPOTS[Math.floor(stepCountRef.current / SEED_PERIOD) % SEED_SPOTS.length];
      bloom(spot.x, spot.y, 1.7, seedTRef.current);
      lastSeedStepRef.current = stepCountRef.current;
    }
    for (let k = 0; k < SIZE; k++) {
      const decay = 1 - Math.min(0.7, dd[k] * 0.32);
      uu[k] *= decay; vv[k] *= decay;
    }
    u0.current.set(uu); v0.current.set(vv); d0.current.set(dd);
    advect("u", dt); u0.current.set(u.current);
    advect("v", dt); v0.current.set(v.current);
    advect("d", dt);
    diffuse("d", 0.0009, dt);
    bounds();
    const dd2 = d.current, uu2 = u.current, vv2 = v.current;
    for (let m = 0; m < SIZE; m++) { dd2[m] *= 0.9985; uu2[m] *= 0.985; vv2[m] *= 0.985; }
    seedTRef.current += dt;
    stepCountRef.current++;
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
        if (q <= 0.02) { px[o] = 255; px[o + 1] = 255; px[o + 2] = 255; px[o + 3] = 255; continue; }
        const band = q > 0.9 ? 2 : q > 0.4 ? 1 : 0;
        const c = pal[band];
        const rr = parseInt(c.slice(1, 3), 16), gg = parseInt(c.slice(3, 5), 16), bb = parseInt(c.slice(5, 7), 16);
        const a = Math.min(1, q * 0.85 + 0.15);
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

  function onDown(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const gx = 1 + (e.clientX - r.left) / r.width * (N - 1);
    const gy = 1 + (e.clientY - r.top) / r.height * (N - 1);
    bloom(gx, gy, 2.0, seedTRef.current * 3.1);
    if (reduced()) render();
  }

  function onMove(e: PtrEvt): void {
    if ((e.pressure ?? 0) === 0 && (e.buttons ?? 0) === 0) return;
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const gx = 1 + (e.clientX - r.left) / r.width * (N - 1);
    const gy = 1 + (e.clientY - r.top) / r.height * (N - 1);
    bloom(gx, gy, 0.55, seedTRef.current * 3.1);
    if (reduced()) render();
  }

  function onKey(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    bloom(N * 0.5, N * 0.5, 2.0, seedTRef.current * 3.1);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M180 208a52 52 0 0 1-104 0c0-44 52-120 52-120s52 76 52 120Z" opacity=".2"/><path d="M133.87 41.42a8 8 0 0 0-11.74 0C107.42 57.11 68 104.61 68 152a60 60 0 0 0 120 0c0-47.39-39.42-94.89-54.13-110.58ZM128 196a44 44 0 0 1-44-44c0-31.68 26.05-68.51 44-90.06 17.95 21.55 44 58.38 44 90.06a44 44 0 0 1-44 44Z"/></g></svg>
          <span>종이를 클릭하면 그 자리에 염료 방울이 떨어져 젖은 경계를 그리며 번집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="잉크 번짐 실험판"
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">32<span className={styles.badgeUnit}>격자</span></b>
        </div>
      </div>
    </main>
  );
}
