// DensityField — vanilla 판(run/308/demo/09-fluid-density-field/index.html) 의 React 포트.
// 시뮬레이션 데이터는 32×32 배열 한 장뿐(이 항목의 핵심 소재). 같은 오프스크린 소스를
// imageSmoothingEnabled=false(최근접)와 true+quality high(쌍선형)로 각각 확대해 나란히 비교한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DensityField.module.scss";

export type DensityFieldProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type PtrEvt = { clientX: number; clientY: number; buttons: number; pointerType: string };

const N = 32;
const SIZE = (N + 2) * (N + 2);
function IX(x: number, y: number): number { return x + (N + 2) * y; }

export default function DensityField({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: DensityFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const duoRef = useRef<HTMLDivElement | null>(null);
  const cvARef = useRef<HTMLCanvasElement | null>(null);
  const cvBRef = useRef<HTMLCanvasElement | null>(null);
  const ctxARef = useRef<CanvasRenderingContext2D | null>(null);
  const ctxBRef = useRef<CanvasRenderingContext2D | null>(null);
  const srcRef = useRef<HTMLCanvasElement | null>(null);
  const sctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const simgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const palRef = useRef({ cr: [255, 247, 234], c1: [230, 208, 173], c2: [218, 184, 138], c3: [201, 152, 94] }) as Box<{ cr: number[]; c1: number[]; c2: number[]; c3: number[] }>;

  const u = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const u0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const v0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d = useRef(new Float32Array(SIZE)) as Box<Float32Array>;
  const d0 = useRef(new Float32Array(SIZE)) as Box<Float32Array>;

  const seedTRef = useRef(0) as Box<number>;
  const lastRef = useRef<{ x: number; y: number } | null>(null) as Box<{ x: number; y: number } | null>;
  const targetRef = useRef<HTMLCanvasElement | null>(null) as Box<HTMLCanvasElement | null>;
  const rafRef = useRef(0) as Box<number>;

  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const duo = duoRef.current, cvA = cvARef.current, cvB = cvBRef.current;
    if (!duo || !cvA || !cvB) return;
    const rect = duo.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    cvA.width = w; cvA.height = h;
    cvB.width = w; cvB.height = h;
  }

  function advect(b: 0 | 1 | 2, dt: number): void {
    const s = b === 0 ? u0.current : b === 1 ? v0.current : d0.current;
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
        dst[IX(i, j)] = s0 * (t0 * s[IX(i0, j0)] + t1 * s[IX(i0, j1)]) +
                        s1 * (t0 * s[IX(i1, j0)] + t1 * s[IX(i1, j1)]);
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

  function splatDye(cx: number, cy: number, amp: number): void {
    const rad = 2.4;
    const dd = d.current;
    for (let j = -3; j <= 3; j++) {
      for (let i = -3; i <= 3; i++) {
        const q = (i * i + j * j) / (rad * rad);
        if (q > 1) continue;
        const gi = cx + i, gj = cy + j;
        if (gi < 1 || gi > N || gj < 1 || gj > N) continue;
        dd[IX(gi, gj)] += Math.exp(-q * 2.2) * amp;
      }
    }
  }

  function inject(t: number): void {
    const ax = N * 0.34 + Math.sin(t * 0.8) * N * 0.16;
    const ay = N * 0.3 + t * N * 0.055;
    const bx = N * 0.66 + Math.sin(t * 1.1 + 2.0) * N * 0.14;
    const by = N * 0.75 - Math.sin(t * 0.7) * N * 0.1;
    splatDye(Math.round(ax), Math.round(ay), 1);
    splatDye(Math.round(bx), Math.round(by), 0.85);
  }

  function drift(): void {
    const cx = N * 0.5, cy = N * 0.5;
    const uu = u.current, vv = v.current;
    for (let j = 2; j <= N - 1; j++) {
      for (let i = 2; i <= N - 1; i++) {
        const dx = i - cx, dy = j - cy;
        const q = Math.sqrt(dx * dx + dy * dy) / (N * 0.5);
        const w = Math.exp(-q * q * 1.6) * 0.4;
        uu[IX(i, j)] += (-dy * 0.045 + 0.07) * w;
        vv[IX(i, j)] += (dx * 0.045) * w;
      }
    }
  }

  function step(dt: number): void {
    drift();
    inject(seedTRef.current);
    u0.current.set(u.current); v0.current.set(v.current); d0.current.set(d.current);
    advect(0, dt); u0.current.set(u.current);
    advect(1, dt); v0.current.set(v.current);
    advect(2, dt);
    bounds();
    const dd = d.current, uu = u.current, vv = v.current;
    for (let k = 0; k < SIZE; k++) { dd[k] *= 0.988; uu[k] *= 0.99; vv[k] *= 0.99; }
    seedTRef.current += dt;
  }

  function paintSource(): void {
    const sctx = sctxRef.current, simg = simgRef.current;
    if (!sctx || !simg) return;
    const px = simg.data;
    const pal = palRef.current;
    const dd = d.current;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const q = dd[IX(i + 1, j + 1)];
        let band: number[], a: number;
        if (q <= 0.02) { band = pal.cr; a = 0; }
        else if (q > 1.15) { band = pal.c3; a = Math.min(1, q - 0.15); }
        else if (q > 0.5) { band = pal.c2; a = Math.min(1, q + 0.1); }
        else { band = pal.c1; a = Math.min(1, q * 1.6); }
        const o = (j * N + i) * 4;
        px[o]     = pal.cr[0] + (band[0] - pal.cr[0]) * a;
        px[o + 1] = pal.cr[1] + (band[1] - pal.cr[1]) * a;
        px[o + 2] = pal.cr[2] + (band[2] - pal.cr[2]) * a;
        px[o + 3] = 255;
      }
    }
    sctx.putImageData(simg, 0, 0);
  }

  function render(): void {
    paintSource();
    const src = srcRef.current;
    const ctxA = ctxARef.current, ctxB = ctxBRef.current;
    const cvA = cvARef.current, cvB = cvBRef.current;
    if (!src || !ctxA || !ctxB || !cvA || !cvB) return;
    const w = cvA.width, h = cvA.height;
    ctxA.imageSmoothingEnabled = false;
    ctxA.clearRect(0, 0, w, h);
    ctxA.drawImage(src, 0, 0, w, h);
    ctxB.imageSmoothingEnabled = true;
    ctxB.imageSmoothingQuality = "high";
    ctxB.clearRect(0, 0, w, h);
    ctxB.drawImage(src, 0, 0, w, h);
  }

  function frame(): void {
    step(1 / 30);
    render();
    rafRef.current = requestAnimationFrame(frame);
  }

  function splat(gx: number, gy: number, fx: number, fy: number, amt: number): void {
    const rad = 3;
    const uu = u.current, vv = v.current, dd = d.current;
    for (let j = -rad; j <= rad; j++) {
      for (let i = -rad; i <= rad; i++) {
        const q = (i * i + j * j) / (rad * rad);
        if (q > 1) continue;
        const gi = gx + i, gj = gy + j;
        if (gi < 1 || gi > N || gj < 1 || gj > N) continue;
        const f = Math.exp(-q * 2.6) * amt;
        const idx = IX(gi, gj);
        uu[idx] += fx * f; vv[idx] += fy * f;
        dd[idx] = Math.min(2, dd[idx] + f * 0.8);
      }
    }
  }

  function onDown(e: PtrEvt): void {
    const duo = duoRef.current;
    if (!duo) return;
    const rect = duo.getBoundingClientRect();
    const half = rect.width / 2;
    targetRef.current = (e.clientX - rect.left) < half ? cvARef.current : cvBRef.current;
  }

  function onMove(e: PtrEvt): void {
    const host = targetRef.current || duoRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const gx = 1 + Math.round((e.clientX - rect.left) / rect.width * (N - 1));
    const gy = 1 + Math.round((e.clientY - rect.top) / rect.height * (N - 1));
    const last = lastRef.current;
    if (last) {
      const fx = (e.clientX - last.x) * 0.15, fy = (e.clientY - last.y) * 0.15;
      splat(gx, gy, fx, fy, Math.min(1.8, Math.hypot(fx, fy)));
    } else {
      splat(gx, gy, 0, 0, 0.8);
    }
    lastRef.current = { x: e.clientX, y: e.clientY };
    if (reduced()) render();
  }

  function endPtr(): void { lastRef.current = null; targetRef.current = null; }

  function onKey(e: KeyEvt): void {
    const dir: Record<string, number[]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] };
    const dv = dir[e.key];
    if (!dv) return;
    e.preventDefault();
    splat(N >> 1, N >> 1, dv[0], dv[1], 1.4);
    if (reduced()) render();
  }

  function onResize(): void { fit(); if (reduced()) render(); }

  function hexToRgb(c: string): number[] {
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }

  useEffect(() => {
    const cvA = cvARef.current, cvB = cvBRef.current;
    if (!cvA || !cvB) return;
    ctxARef.current = cvA.getContext("2d", { willReadFrequently: true });
    ctxBRef.current = cvB.getContext("2d", { willReadFrequently: true });
    const src = document.createElement("canvas");
    src.width = N; src.height = N;
    srcRef.current = src;
    sctxRef.current = src.getContext("2d");
    if (sctxRef.current) simgRef.current = sctxRef.current.createImageData(N, N);
    const root = rootRef.current;
    if (root) {
      const css = getComputedStyle(root);
      const p1 = css.getPropertyValue("--den-1").trim();
      const p2 = css.getPropertyValue("--den-2").trim();
      const p3 = css.getPropertyValue("--den-3").trim();
      const pp = css.getPropertyValue("--den-paper").trim();
      if (p1 && p2 && p3 && pp) {
        palRef.current = { cr: hexToRgb(pp), c1: hexToRgb(p1), c2: hexToRgb(p2), c3: hexToRgb(p3) };
      }
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Z" opacity=".2"/><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM96,200H56V168H96Zm0-56H56V112H96Zm0-56H56V56H96Zm104,112H112V168h88Zm0-56H112V112h88Zm0-56H112V56h88Z"/></g></svg>
          <span>같은 32×32 밀도 배열을 두 번 그립니다 — 왼쪽은 칸 그대로, 오른쪽은 보간으로 펴냅니다</span>
        </p>
        <div
          className={styles.duo}
          ref={duoRef}
          role="application"
          aria-label="밀도장 확대 비교 실험판"
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={endPtr}
          onPointerLeave={endPtr}
          onKeyDown={onKey}
        >
          <div className={styles.pane}>
            <canvas className={styles.cv} ref={cvARef}></canvas>
            <b className={styles.tag}>최근접</b>
          </div>
          <div className={styles.pane}>
            <canvas className={styles.cv} ref={cvBRef}></canvas>
            <b className={styles.tag}>보간</b>
          </div>
          <b className={styles.badge} aria-hidden="true">32<span className={styles.badgeUnit}>×32</span></b>
        </div>
      </div>
    </main>
  );
}
