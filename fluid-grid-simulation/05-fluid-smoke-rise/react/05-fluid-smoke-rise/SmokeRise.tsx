// SmokeRise — vanilla 판(run/308/demo/05-fluid-smoke-rise/index.html) 의 React 포트.
// 밀도에 비례하는 부력(온도장 없는 근사)과 결정적 가우시안 옆흔들림으로 연기 기둥을 세운다.
// 격자 필드는 ref 상자 안에서만 산다 — React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SmokeRise.module.scss";

export type SmokeRiseProps = {
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

const BUOY = 3.2;
const WIND = 0.55;

const SEED_SPOTS = [
  { x: N * 0.3, y: N - 1.5 },
  { x: N * 0.55, y: N - 1.5 },
  { x: N * 0.76, y: N - 1.5 },
];
const SEED_PERIOD = 20;

// 결정적 가우시안 노이즈 — Math.random 을 쓰지 않아 같은 편의 캡처가 항상 같은 연기를 담는다.
function gnoise(x: number, y: number): number {
  return (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
}

export default function SmokeRise({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: SmokeRiseProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const palRef = useRef(["#b8b3c4", "#cdc8d6", "#e9e5ef"]) as Box<string[]>;

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
      dd[IX(i, 0)] = dd[IX(i, 1)] * 0.35; dd[IX(i, N + 1)] = dd[IX(i, N)] * 0.35;
      uu[IX(i, 0)] = uu[IX(i, 1)] * 0.4; uu[IX(i, N + 1)] = uu[IX(i, N)] * 0.4;
      vv[IX(i, 0)] = vv[IX(i, 1)] * 0.4; vv[IX(i, N + 1)] = vv[IX(i, N)] * 0.4;
    }
    for (let j = 1; j <= N; j++) {
      dd[IX(0, j)] = dd[IX(1, j)] * 0.5; dd[IX(N + 1, j)] = dd[IX(N, j)] * 0.5;
      uu[IX(0, j)] = uu[IX(1, j)] * 0.4; uu[IX(N + 1, j)] = uu[IX(N, j)] * 0.4;
      vv[IX(0, j)] = vv[IX(1, j)] * 0.4; vv[IX(N + 1, j)] = vv[IX(N, j)] * 0.4;
    }
  }

  function puff(gx: number, gy: number, amp: number): void {
    const r = 3.2;
    const uu = u.current, vv = v.current, dd = d.current;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const q = (i * i + j * j) / (r * r);
        if (q > 1) continue;
        const f = Math.exp(-q * 2.2) * amp;
        const ix = Math.round(gx + i), iy = Math.round(gy + j);
        if (ix < 1 || ix > N || iy < 1 || iy > N) continue;
        const idx = IX(ix, iy);
        dd[idx] = Math.min(2.4, dd[idx] + f);
        uu[idx] += gnoise(ix, iy) * f * 0.06;
        vv[idx] -= f * 0.16;
      }
    }
  }

  function step(dt: number): void {
    const uu = u.current, vv = v.current, dd = d.current;
    const uu0 = u0.current, vv0 = v0.current, dd0 = d0.current;
    if (stepCountRef.current - lastSeedStepRef.current >= SEED_PERIOD) {
      const order = Math.floor(stepCountRef.current / SEED_PERIOD) % SEED_SPOTS.length;
      const t = seedTRef.current;
      puff(SEED_SPOTS[order].x + Math.sin(t * 0.9) * 1.2, SEED_SPOTS[order].y, 2.1);
      puff(SEED_SPOTS[(order + 1) % SEED_SPOTS.length].x + Math.cos(t * 0.7) * 1.4, SEED_SPOTS[(order + 1) % SEED_SPOTS.length].y, 2.1);
      puff(SEED_SPOTS[(order + 2) % SEED_SPOTS.length].x + Math.sin(t * 0.5 + 2) * 1.4, SEED_SPOTS[(order + 2) % SEED_SPOTS.length].y, 2.1);
      lastSeedStepRef.current = stepCountRef.current;
    }
    uu0.set(uu); vv0.set(vv); dd0.set(dd);
    for (let k = 0; k < SIZE; k++) vv0[k] -= Math.min(1.6, dd0[k]) * BUOY * dt;
    const h = Math.sin(seedTRef.current * 1.7) * 3.1;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        const idx = IX(i, j);
        const sw = gnoise(i * 0.31 + h, j * 0.27 - h * 0.6) + gnoise(i * 0.13 - h * 0.4, j * 0.19 + h * 0.8) * 0.5;
        uu0[idx] += sw * WIND * dt * Math.min(1, dd0[idx] * 0.9);
      }
    }
    advect("u", dt); u0.current.set(u.current);
    advect("v", dt); v0.current.set(v.current);
    advect("d", dt);
    diffuse("d", 0.0006, dt);
    bounds();
    const dd2 = d.current, uu2 = u.current, vv2 = v.current;
    for (let m = 0; m < SIZE; m++) { dd2[m] *= 0.998; uu2[m] *= 0.988; vv2[m] *= 0.988; }
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
        if (q <= 0.012) { px[o] = 23; px[o + 1] = 20; px[o + 2] = 26; px[o + 3] = 255; continue; }
        const band = q > 0.85 ? 2 : q > 0.34 ? 1 : 0;
        const c = pal[band];
        const rr = parseInt(c.slice(1, 3), 16), gg = parseInt(c.slice(3, 5), 16), bb = parseInt(c.slice(5, 7), 16);
        const a = Math.min(1, q * 0.95);
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

  function pointTo(e: PtrEvt): { gx: number; gy: number } | null {
    const field = fieldRef.current;
    if (!field) return null;
    const r = field.getBoundingClientRect();
    const gx = 1 + (e.clientX - r.left) / r.width * (N - 1);
    const gy = 1 + (e.clientY - r.top) / r.height * (N - 1);
    return { gx, gy };
  }

  function onDown(e: PtrEvt): void {
    const p = pointTo(e);
    if (!p) return;
    puff(p.gx, p.gy, 2.0);
    if (reduced()) render();
  }

  function onMove(e: PtrEvt): void {
    if ((e.pressure ?? 0) === 0 && (e.buttons ?? 0) === 0) return;
    const p = pointTo(e);
    if (!p) return;
    puff(p.gx, p.gy, 0.5);
    if (reduced()) render();
  }

  function onKey(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    puff(N * 0.5, N * 0.8, 2.0);
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
      for (let w = 0; w < 90; w++) step(1 / 30);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M236 128a108 108 0 0 1-216 0a100 100 0 0 1 100-100a92 92 0 0 1 92 92a84 84 0 0 1-84 84a76 76 0 0 1-76-76a68 68 0 0 1 68-68a60 60 0 0 1 60 60a52 52 0 0 1-52 52a44 44 0 0 1-44-44a36 36 0 0 1 36-36a28 28 0 0 1 28 28a20 20 0 0 1-20 20a12 12 0 0 1-12-12" opacity=".2" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/><path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88Zm0-152a64 64 0 1 0 64 64a64.07 64.07 0 0 0-64-64Zm0 112a48 48 0 1 1 48-48a48.05 48.05 0 0 1-48 48Z"/></g></svg>
          <span>아래에서 피어오른 연기가 밀도만큼 받는 부력으로 올라가며 옆 바람에 흔들립니다 — 화면을 눌러 연기를 피워 보세요</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="연기 상승 실험판"
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
