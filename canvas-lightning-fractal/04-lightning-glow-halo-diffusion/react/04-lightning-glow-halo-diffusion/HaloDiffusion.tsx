// HaloDiffusion — vanilla 판(run/316/demo/04-lightning-glow-halo-diffusion/index.html) 의 React 포트.
// 밝기 버퍼(Float32Array) 를 매 프레임 이웃 4픽셀 평균 쪽으로 확산 + 냉각하고, 살아 있는 낙뢰를
// 중점변위 경로로 도장찍는다. 화면 재구성은 LUT 조회 + putImageData 한 번으로 끝낸다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HaloDiffusion.module.scss";

export type HaloDiffusionProps = {
  duration?: string;
  easing?: string;
  color?: string;
  spread?: number;   // 확산 계수 — 변형 "번짐" 축(0.44 → 0.62)
  cool?: number;      // 냉각 계수 — 변형 "잔광 시간" 축(0.986 → 0.988)
  gapMs?: number;     // 평균 낙뢰 간격(ms) — 변형 "하늘 리듬" 축(430 → 1500)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Branch = { sx: number; sy: number; ex: number; ey: number; mag: number };
type Strike = { ax: number; bx: number; life: number; branches: Branch[] };
type Colors = { ink: RGB; halo: RGB; core: RGB };

const FIELD_LABEL = "번개 잔광 확산 실험판";

function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function HaloDiffusion({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  spread = 0.44,
  cool = 0.986,
  gapMs = 430,
}: HaloDiffusionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const spreadRef = useRef(spread) as Box<number>;
  const coolRef = useRef(cool) as Box<number>;
  const gapRef = useRef(gapMs) as Box<number>;
  const lumRef = useRef<Float32Array | null>(null) as Box<Float32Array | null>;
  const lum2Ref = useRef<Float32Array | null>(null) as Box<Float32Array | null>;
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const lutRef = useRef<{ r: Uint8ClampedArray; g: Uint8ClampedArray; b: Uint8ClampedArray } | null>(null);
  const strikesRef = useRef<Strike[]>([]) as Box<Strike[]>;
  const timerRef = useRef(0) as Box<number>;
  const randRef = useRef<() => number>(makePRNG(0x3160404)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [spreadShown] = useState(spread);
  const [coolShown] = useState(cool);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function buildLUT(col: Colors): void {
    const r = new Uint8ClampedArray(256), g = new Uint8ClampedArray(256), b = new Uint8ClampedArray(256);
    const m = [0, 0.32, 0.62, 0.88, 1];
    const cs: RGB[] = [
      col.ink,
      [col.ink[0] + (col.halo[0] - col.ink[0]) * 0.42, col.ink[1] + (col.halo[1] - col.ink[1]) * 0.42, col.ink[2] + (col.halo[2] - col.ink[2]) * 0.42],
      col.halo,
      col.core,
      [255, 252, 255],
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < 3 && t > m[k + 1]) k++;
      const f = (t - m[k]) / (m[k + 1] - m[k] || 1);
      r[i] = cs[k][0] + (cs[k + 1][0] - cs[k][0]) * f;
      g[i] = cs[k][1] + (cs[k + 1][1] - cs[k][1]) * f;
      b[i] = cs[k][2] + (cs[k + 1][2] - cs[k][2]) * f;
    }
    lutRef.current = { r, g, b };
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width));
    const H = Math.max(2, Math.round(r.height));
    sizeRef.current.w = W;
    sizeRef.current.h = H;
    cv.width = W; cv.height = H;
    ctxRef.current = ctx;
    lumRef.current = new Float32Array(W * H);
    lum2Ref.current = new Float32Array(W * H);
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    imgRef.current = img;
    randRef.current = makePRNG(0x3160404);
    strikesRef.current = [];
    timerRef.current = 0;
  }

  function diffuse(): void {
    const { w: W, h: H } = sizeRef.current;
    let lum = lumRef.current, lum2 = lum2Ref.current;
    if (!lum || !lum2) return;
    const SP = spreadRef.current, CL = coolRef.current;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      const up = (y > 0 ? y - 1 : y) * W;
      const dn = (y < H - 1 ? y + 1 : y) * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const l = lum[i];
        const av = (lum[row + (x > 0 ? x - 1 : x)] + lum[row + (x < W - 1 ? x + 1 : x)] + lum[up + x] + lum[dn + x]) * 0.25;
        lum2[i] = (l + SP * (av - l)) * CL;
      }
    }
    lumRef.current = lum2;
    lum2Ref.current = lum;
  }

  function genBolt(ax: number, ay: number, bx: number, by: number, mag: number, depth: number): Pt[] {
    const rand = randRef.current;
    let pts: Pt[] = [{ x: ax, y: ay }, { x: bx, y: by }];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    let off = mag;
    for (let d = 0; d < depth; d++) {
      const next: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const r = (rand() * 2 - 1) * off;
        next.push({ x: (p.x + q.x) * 0.5 + nx * r, y: (p.y + q.y) * 0.5 + ny * r }, q);
      }
      pts = next;
      off *= 0.55;
    }
    return pts;
  }

  function stampPoint(px: number, py: number, radius: number): void {
    const lum = lumRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!lum) return;
    const cx = Math.round(px), cy = Math.round(py);
    for (let yy = cy - radius; yy <= cy + radius; yy++) {
      if (yy < 0 || yy >= H) continue;
      for (let xx = cx - radius; xx <= cx + radius; xx++) {
        if (xx < 0 || xx >= W) continue;
        const dxx = xx - cx, dyy = yy - cy;
        const d = Math.sqrt(dxx * dxx + dyy * dyy);
        if (d > radius) continue;
        const v = d <= 1 ? 1.25 : (1 - d / radius) * 0.62;
        const idx = yy * W + xx;
        if (v > lum[idx]) lum[idx] = v;
      }
    }
  }

  function stampPath(pts: Pt[], radius: number): void {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      const seg = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 2));
      for (let s = 0; s < seg; s++) {
        const f = s / seg;
        stampPoint(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f, radius);
      }
    }
    stampPoint(pts[pts.length - 1].x, pts[pts.length - 1].y, radius);
  }

  function newStrike(): Strike {
    const rand = randRef.current;
    const { w: W, h: H } = sizeRef.current;
    const ax = W * (0.12 + rand() * 0.76);
    const bx = W * (0.12 + rand() * 0.76);
    const s: Strike = { ax, bx, life: 4 + ((rand() * 3) | 0), branches: [] };
    const nb = 2 + ((rand() * 2) | 0);
    for (let k = 0; k < nb; k++) {
      const t = 0.3 + rand() * 0.45;
      const dir = rand() < 0.5 ? -1 : 1;
      s.branches.push({
        sx: ax + (bx - ax) * t,
        sy: H * t,
        ex: ax + (bx - ax) * t + dir * (W * 0.1 + rand() * W * 0.2),
        ey: H * (0.7 + rand() * 0.35),
        mag: H * 0.1,
      });
    }
    return s;
  }

  function stepStrikes(dtMs: number): void {
    const rand = randRef.current;
    const { h: H } = sizeRef.current;
    timerRef.current -= dtMs;
    if (timerRef.current <= 0) {
      strikesRef.current.push(newStrike());
      timerRef.current = gapRef.current * (0.5 + rand());
    }
    const strikes = strikesRef.current;
    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      stampPath(genBolt(s.ax, -8, s.bx, H + 8, H * 0.14, 5), 6);
      for (let k = 0; k < s.branches.length; k++) {
        const b = s.branches[k];
        stampPath(genBolt(b.sx, b.sy, b.ex, b.ey, b.mag, 4), 5);
      }
      s.life--;
      if (s.life <= 0) strikes.splice(i, 1);
    }
  }

  function compose(): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const lum = lumRef.current;
    const lut = lutRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !img || !lum || !lut) return;
    const d = img.data, n = W * H;
    for (let i = 0; i < n; i++) {
      const v = lum[i];
      const li = v >= 1 ? 255 : v <= 0 ? 0 : (v * 255) | 0;
      const j = i << 2;
      d[j] = lut.r[li]; d[j + 1] = lut.g[li]; d[j + 2] = lut.b[li];
    }
    ctx.putImageData(img, 0, 0);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const dt = Math.min(50, now - (prev || now));
    prev = now;
    diffuse();
    stepStrikes(dt);
    compose();
    rafRef.current = requestAnimationFrame(frame);
  }

  function stillDraw(): void {
    fit();
    diffuse();
    stepStrikes(1000);
    for (let w = 0; w < 6; w++) { diffuse(); stepStrikes(16); }
    compose();
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    spreadRef.current = spread;
    coolRef.current = cool;
    gapRef.current = gapMs;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      halo: tokRGB(root, "--bolt-halo"),
      core: tokRGB(root, "--bolt-core"),
    };
    fit();
    buildLUT(colRef.current);
    function onResize(): void {
      fit();
      if (colRef.current) buildLUT(colRef.current);
      if (reduced()) stillDraw();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillDraw();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, cool, gapMs]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M150 14 66 146h49l-24 96 99-138h-52l28-90z"/></svg>
          <span>번개가 지나간 자리의 밝기 버퍼를 매 프레임 이웃 픽셀 평균으로 섞어 다시 씁니다 — 선이 사라진 뒤에도 헤일로가 번지다 식습니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>확산 <b className={styles.val}>{spreadShown}</b> · 냉각 <b className={styles.val}>{coolShown}</b></span>
          <span className={styles.metaDim}>캔버스 · ImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
