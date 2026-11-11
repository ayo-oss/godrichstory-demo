// RiverErosion — vanilla 판(run/309/demo/08-terrain-river-erosion/index.html) 의 React 포트.
// 2D fbm 높이맵 위에서 시작점(수원)마다 이웃 8칸 중 가장 낮은 칸으로 한 칸씩 내려가는
// 최급경사(steepest descent) 추적을 반복해 lineTo 로 강줄기를 긋는다. 시드가 바뀌면
// 지형이 달라져 물길이 다른 계곡으로 갈라진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RiverErosion.module.scss";

export type RiverErosionProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const GW = 46, GH = 28;
const SCALE = 0.075, FLOW = 0.7, SPRINGS = 7, MAX_STEP = 90;

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function rgbOf(v: string): [number, number, number] {
  let s = v.trim().replace("#", "");
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

export default function RiverErosion({
  duration = "2s",
  easing = "ease-out",
  color = "#0a4fe8",
}: RiverErosionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const permRef = useRef(new Uint8Array(512)) as Box<Uint8Array>;
  const valRef = useRef(new Float32Array(256)) as Box<Float32Array>;
  const heightsRef = useRef(new Float32Array(GW * GH)) as Box<Float32Array>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [still, setStill] = useState(false);
  const [flowPct, setFlowPct] = useState(0);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildTables(sd: number): void {
    const rng = mulberry32(sd >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = permRef.current, val = valRef.current;
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) val[i] = rng();
  }

  function vnoise(x: number, y: number, z: number): number {
    const perm = permRef.current, val = valRef.current;
    let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    xi &= 255; yi &= 255; zi &= 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const a = perm[xi] + yi, b = perm[xi + 1] + yi;
    const aa = perm[a] + zi, ab = perm[a + 1] + zi;
    const ba = perm[b] + zi, bb = perm[b + 1] + zi;
    const c000 = val[perm[aa]], c100 = val[perm[ba]];
    const c010 = val[perm[ab]], c110 = val[perm[bb]];
    const c001 = val[perm[aa + 1]], c101 = val[perm[ba + 1]];
    const c011 = val[perm[ab + 1]], c111 = val[perm[bb + 1]];
    const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
    const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
    const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
    return y0 + (y1 - y0) * w;
  }

  function fbm(x: number, y: number, z: number): number {
    let sum = 0, amp = 0.5, norm = 0, f = 1;
    for (let i = 0; i < 5; i++) {
      sum += vnoise(x * f, y * f, z * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }

  function fit(): void {
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = ctxRef.current;
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function springCell(k: number): number {
    const cols = Math.ceil(SPRINGS / 2);
    const col = k % cols, row = (k / cols) | 0;
    let cx = Math.round(((col + 0.55) / cols) * (GW - 3)) + 1;
    let cy = Math.round((row === 0 ? 0.18 : 0.62) * (GH - 3)) + 1;
    if (cx < 1) cx = 1; if (cx > GW - 2) cx = GW - 2;
    if (cy < 1) cy = 1; if (cy > GH - 2) cy = GH - 2;
    return cx + cy * GW;
  }

  function trace(ix: number): number[] {
    const heights = heightsRef.current;
    const path = [ix];
    let x = ix % GW, y = (ix / GW) | 0;
    for (let s = 0; s < MAX_STEP; s++) {
      let best = -1, bestH = heights[y * GW + x];
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy; if (ny < 0 || ny >= GH) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx; if (nx < 0 || nx >= GW) continue;
          const h = heights[ny * GW + nx];
          if (h < bestH) { bestH = h; best = ny * GW + nx; }
        }
      }
      if (best < 0) break;
      x = best % GW; y = (best / GW) | 0;
      path.push(best);
      if (y === GH - 1 || y === 0) break;
    }
    return path;
  }

  function tok(name: string): string {
    const root = rootRef.current;
    if (!root) return "#000";
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const heights = heightsRef.current;
    const BANDS = ["--c0", "--c1", "--c2", "--c3", "--c4", "--c5"].map((n) => rgbOf(tok(n)));
    const RIVER = rgbOf(tok("--river"));
    const SPRING = rgbOf(tok("--spring"));
    const z = sec * FLOW;
    const cw = W / GW + 1, ch = H / GH + 1;
    let hi = 0, stepSum = 0;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        let n = fbm(gx * SCALE + 13.7, gy * SCALE + 71.3, z);
        n = n * 1.5 - 0.25;
        if (n < 0) n = 0; else if (n > 1) n = 1;
        heights[hi++] = n;
        const bandF = n * 5;
        let lo = bandF | 0; if (lo > 4) lo = 4;
        let hi2 = lo + 1; if (hi2 > 5) hi2 = 5;
        const frac = bandF - lo;
        const FINE = 18;
        const step = (frac * FINE) | 0;
        const mixT = step / FINE;
        const cl = BANDS[lo], ch2 = BANDS[hi2];
        const r = cl[0] + (ch2[0] - cl[0]) * mixT;
        const g = cl[1] + (ch2[1] - cl[1]) * mixT;
        const bch = cl[2] + (ch2[2] - cl[2]) * mixT;
        ctx.fillStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (bch | 0) + ")";
        ctx.fillRect(gx * W / GW - 0.5, gy * H / GH - 0.5, cw, ch);
      }
    }
    for (let k = 0; k < SPRINGS; k++) {
      const path = trace(springCell(k));
      if (path.length < 2) continue;
      stepSum += path.length;
      const jx = (path[0] % GW) + 0.5, jy = ((path[0] / GW) | 0) + 0.5;
      ctx.beginPath();
      ctx.moveTo(jx * (W / GW), jy * (H / GH));
      for (let p = 1; p < path.length; p++) {
        const px = (path[p] % GW) + 0.5, py = ((path[p] / GW) | 0) + 0.5;
        ctx.lineTo(px * (W / GW), py * (H / GH));
      }
      const wOut = 1.6 + (path.length / MAX_STEP) * 3.4;
      ctx.lineWidth = wOut;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(" + RIVER[0] + "," + RIVER[1] + "," + RIVER[2] + ",0.92)";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(jx * (W / GW), jy * (H / GH), 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(" + SPRING[0] + "," + SPRING[1] + "," + SPRING[2] + ")";
      ctx.fill();
    }
    setFlowPct(Math.round((stepSum / SPRINGS / MAX_STEP) * 100));
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    buildTables(v);
    if (reduced()) paint(0);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(0);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    buildTables(seed);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      setStill(true);
      paint(0);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M112 56a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2"/><path d="M105.46,210.4l-67-144.87a8,8,0,0,1,8.93-11.25L215.75,86A8,8,0,0,1,219,99.62l-107.52,47.12,15.4,67.6a8,8,0,0,1-15.53,4.6Z" opacity=".2"/><path d="M30.93,48.81a16,16,0,0,1,19.4-6.36l154.72,61.76a16,16,0,0,1-.77,29.84l-107.5,47.12L74.4,248.16a16,16,0,0,1-29.51-5.95Z"/></g></svg>
          <span>시드를 바꾸면 물길이 다른 계곡으로 갈라집니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="img" aria-label="고도띠 지형 위로 강줄기가 흘러 내려가는 침식 지도">
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge}>수원 {SPRINGS}곳</b>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="침식 시드" onChange={onSeed} />
          </label>
          <b className={styles.val}>추적 진행 {flowPct}%</b>
        </div>
      </div>
    </main>
  );
}
