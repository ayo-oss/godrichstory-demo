// VortexDecay — vanilla 판(run/308/demo/06-fluid-vortex-decay/index.html) 의 React 포트.
// 초기화 때 랭킨 소용돌이 속도장을 한 번 심고 점성 감쇠만 두면 시간이 갈수록 퍼져 사라지는 소용돌이가 관찰된다.
// 격자 필드는 ref 상자 안에서만 산다 — React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./VortexDecay.module.scss";

export type VortexDecayProps = {
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

const R_CORE = N * 0.17;
const OMEGA = 1.35;
const LIFE = 110;

export default function VortexDecay({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: VortexDecayProps) {
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

  const lifeStepRef = useRef(0) as Box<number>;
  const cycleRef = useRef(0) as Box<number>;
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

  function seedVortex(cx: number, cy: number, dir: number): void {
    const uu = u.current, vv = v.current, dd = d.current;
    const u0v = u0.current, v0v = v0.current, d0v = d0.current;
    uu.fill(0); vv.fill(0); dd.fill(0);
    u0v.fill(0); v0v.fill(0); d0v.fill(0);
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const dx = i - cx, dy = j - cy;
        const r = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const vTheta = r <= R_CORE ? OMEGA * r : OMEGA * (R_CORE * R_CORE) / r;
        const idx = IX(i, j);
        uu[idx] = dir * (-dy / r) * vTheta;
        vv[idx] = dir * (dx / r) * vTheta;
        const ring = Math.exp(-Math.pow((r - R_CORE * 1.15) / (R_CORE * 0.85), 2));
        dd[idx] = ring * 1.4;
      }
    }
    lifeStepRef.current = 0;
  }

  function step(dt: number): void {
    u0.current.set(u.current); v0.current.set(v.current); d0.current.set(d.current);
    advect("u", dt); u0.current.set(u.current);
    advect("v", dt); v0.current.set(v.current);
    advect("d", dt);
    diffuse("u", 0.0016, dt);
    diffuse("v", 0.0016, dt);
    diffuse("d", 0.0016, dt);
    bounds();
    const uu = u.current, vv = v.current, dd = d.current;
    const decay = 0.9905;
    for (let k = 0; k < SIZE; k++) { uu[k] *= decay; vv[k] *= decay; dd[k] *= 0.988; }
    lifeStepRef.current++;
    if (lifeStepRef.current >= LIFE) {
      cycleRef.current++;
      const c = cycleRef.current;
      const dir = c % 2 === 0 ? 1 : -1;
      const cx = N * 0.5 + (c % 3 - 1) * N * 0.05;
      const cy = N * 0.5 + ((c + 1) % 3 - 1) * N * 0.05;
      seedVortex(cx, cy, dir);
    }
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

  function onDown(e: PtrEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const gx = 1 + (e.clientX - r.left) / r.width * (N - 1);
    const gy = 1 + (e.clientY - r.top) / r.height * (N - 1);
    cycleRef.current++;
    seedVortex(gx, gy, cycleRef.current % 2 === 0 ? 1 : -1);
    if (reduced()) render();
  }

  function onKey(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    cycleRef.current++;
    seedVortex(N * 0.5, N * 0.5, cycleRef.current % 2 === 0 ? 1 : -1);
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
    seedVortex(N * 0.5, N * 0.5, 1);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 216a88 88 0 1 1 88-88 8 8 0 0 1-16 0 72 72 0 1 0-72 72 8 8 0 0 1 0 16Z" opacity=".2"/><path d="M128 24a104.2 104.2 0 1 0 73.5 30.5 8 8 0 0 0-11.3 11.3A88 88 0 1 1 40 128a8 8 0 0 0-16 0A104 104 0 0 0 128 24Zm0 40a64 64 0 1 1-64 64 8 8 0 0 0 16 0 48 48 0 1 0 48-48 8 8 0 0 1 0-16Z"/></g></svg>
          <span>중심은 강체처럼 함께 돌고 바깥은 멀어질수록 느려지며, 점성으로 시간이 갈수록 흐려져 사라집니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="소용돌이 감쇠 실험판"
          tabIndex={0}
          onPointerDown={onDown}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">32<span className={styles.badgeUnit}>격자</span></b>
        </div>
      </div>
    </main>
  );
}
