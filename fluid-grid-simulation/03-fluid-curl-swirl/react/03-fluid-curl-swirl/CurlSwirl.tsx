// CurlSwirl — vanilla 판(run/308/demo/03-fluid-curl-swirl/index.html) 의 React 포트.
// 저해상 격자의 수치 점성으로 눌려 죽는 소용돌이를 컬(vorticity) 기울기 방향 힘으로 되살린다.
// 격자 필드는 ref 상자 안에서만 산다 — React 상태로 두면 리렌더가 매 프레임 일어나 60fps 예산을 못 맞춘다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CurlSwirl.module.scss";

export type CurlSwirlProps = {
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

const EPS = 1e-5;
const VORT = 12;

export default function CurlSwirl({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#9ac2df",
}: CurlSwirlProps) {
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
  const curl = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

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
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
  }

  function calcCurl(): void {
    const uu0 = u0.current, vv0 = v0.current, cc = curl.current;
    for (let j = 1; j <= N; j++) {
      for (let i = 1; i <= N; i++) {
        cc[IX(i, j)] = 0.5 * ((vv0[IX(i + 1, j)] - vv0[IX(i - 1, j)]) - (uu0[IX(i, j + 1)] - uu0[IX(i, j - 1)]));
      }
    }
  }

  function confine(dt: number): void {
    const uu0 = u0.current, vv0 = v0.current, cc = curl.current;
    for (let j = 2; j < N; j++) {
      for (let i = 2; i < N; i++) {
        const idx = IX(i, j);
        let gx = (Math.abs(cc[IX(i + 1, j)]) - Math.abs(cc[IX(i - 1, j)])) * 0.5;
        let gy = (Math.abs(cc[IX(i, j + 1)]) - Math.abs(cc[IX(i, j - 1)])) * 0.5;
        const len = Math.sqrt(gx * gx + gy * gy) + EPS;
        gx /= len; gy /= len;
        const c = cc[idx];
        uu0[idx] += gx * c * VORT * dt;
        vv0[idx] += gy * c * VORT * dt;
      }
    }
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
    const uu0 = u0.current, vv0 = v0.current, dd0 = d0.current;
    const s1x = N * 0.32 + Math.sin(t * 0.4) * N * 0.04;
    const s1y = N * 0.5 + Math.cos(t * 0.33) * N * 0.05;
    const s2x = N * 0.68 + Math.sin(t * 0.31 + 2) * N * 0.04;
    const s2y = N * 0.5 + Math.cos(t * 0.47 + 1) * N * 0.05;
    const rv = 4.5;
    const spin = 5.2 + Math.sin(t * 0.8) * 1.4;
    for (let j = -rv; j <= rv; j++) {
      for (let i = -rv; i <= rv; i++) {
        const q = (i * i + j * j) / (rv * rv);
        if (q > 1) continue;
        const f = Math.exp(-q * 2.4);
        const idx1 = IX(Math.round(s1x + i), Math.round(s1y + j));
        uu0[idx1] += -j * f * spin * 0.3; vv0[idx1] += i * f * spin * 0.3;
        const idx2 = IX(Math.round(s2x + i), Math.round(s2y + j));
        uu0[idx2] += j * f * spin * 0.3; vv0[idx2] += -i * f * spin * 0.3;
      }
    }
    const mx = N * 0.5 + Math.sin(t * 0.6) * N * 0.06;
    const my = N * 0.5 + Math.cos(t * 0.5) * N * 0.06;
    const rx = N * 0.22, ry = N * 0.16;
    for (let y = -Math.round(ry); y <= Math.round(ry); y++) {
      for (let x = -Math.round(rx); x <= Math.round(rx); x++) {
        const qq = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (qq > 1) continue;
        const amt = Math.exp(-qq * 1.4) * 0.8;
        const idxM = IX(Math.round(mx + x), Math.round(my + y));
        dd0[idxM] += amt * ((t * 0.22 % 1) < 0.5 ? 1 : 0.6);
      }
    }
  }

  function step(dt: number): void {
    u0.current.set(u.current); v0.current.set(v.current); d0.current.set(d.current);
    inject(seedTRef.current);
    calcCurl();
    confine(dt);
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
    const dir = ({ ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] } as Record<string, number[]>)[e.key];
    if (!dir) return;
    e.preventDefault();
    splat(N >> 1, N >> 1, dir[0], dir[1], 1.2);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M240 144h-32a80 80 0 0 1-80 80a88 88 0 0 1-88-88a96 96 0 0 1 96-96a104 104 0 0 1 104 104" opacity=".2"/><path d="M248 144a8 8 0 0 1-16 0a96.11 96.11 0 0 0-96-96a88.1 88.1 0 0 0-88 88a80.09 80.09 0 0 0 80 80a72.08 72.08 0 0 0 72-72a64.07 64.07 0 0 0-64-64a56.06 56.06 0 0 0-56 56a48.05 48.05 0 0 0 48 48a40 40 0 0 0 40-40a32 32 0 0 0-32-32a24 24 0 0 0-24 24a16 16 0 0 0 16 16a8 8 0 0 0 8-8a8 8 0 0 1 0-16a16 16 0 0 1 16 16a24 24 0 0 1-24 24a32 32 0 0 1-32-32a40 40 0 0 1 40-40a48.05 48.05 0 0 1 48 48a56.06 56.06 0 0 1-56 56a64.07 64.07 0 0 1-64-64a72.08 72.08 0 0 1 72-72a80.09 80.09 0 0 0 80 80a88.1 88.1 0 0 1-88 88a96.11 96.11 0 0 1-96-96A104.11 104.11 0 0 1 136 32a112.12 112.12 0 0 1 112 112"/></g></svg>
          <span>컬(회전 성분)의 기울기 방향으로 힘을 되먹이는 보텍시티 강화가 눌린 연기를 다시 삽니다 — 커서로 소용돌이를 그려보세요</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label="컬링 소용돌이 실험판"
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          onKeyDown={onKey}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true">12<span className={styles.badgeUnit}>강화</span></b>
        </div>
      </div>
    </main>
  );
}
