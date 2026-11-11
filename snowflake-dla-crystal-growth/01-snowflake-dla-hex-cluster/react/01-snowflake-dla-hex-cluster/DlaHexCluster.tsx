// DlaHexCluster — vanilla 판(run/319/demo/01-snowflake-dla-hex-cluster/index.html) 의 React 포트.
// 기본 육각 응집 — DLA(diffusion-limited aggregation). 씨앗 하나를 중앙에 두고 바깥 링에서
// 입자를 발사해 6방향 랜덤워크를 걷게 하고, 결정에 닿으면 그 칸에 얼어 붙는다. 이 규칙만
// 수천 번 반복하면 육각 팁이 뾰족한 프랙탈 클러스터가 저절로 자란다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DlaHexCluster.module.scss";

export type DlaHexClusterProps = {
  duration?: string;
  easing?: string;
  color?: string;
  particles?: number;   // 동시에 떠 있는 입자 수 — 응집 속도
  stick?: number;       // 닿았을 때 붙을 확률(1.0 = 즉시 응고)
  maxAge?: number;      // 방금 붙은 칸이 빛나는 시간(초)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Particle = [number, number, number, number];
type Snow = { x: number; y: number; r: number; v: number; sway: number; ph: number; tw: number };
type Colors = { ink: RGB; deep: RGB; haze: RGB; mote: RGB; ice: RGB; glow: RGB; lilac: RGB; mint: RGB; mist: RGB };

const FIELD_LABEL = "DLA 육각 응집 실험판";
const DI = [-1, -1, 0, 1, 0, -1];
const DJ_EVEN = [0, -1, -1, 0, 0, 0];
const DJ_ODD = [0, 0, 0, 0, 1, 1];

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

export default function DlaHexCluster({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c9b6ff",
  particles = 34,
  stick = 1.0,
  maxAge = 0.55,
}: DlaHexClusterProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const particlesRef = useRef(particles) as Box<number>;
  const stickRef = useRef(stick) as Box<number>;
  const maxAgeRef = useRef(maxAge) as Box<number>;
  const randRef = useRef(makePRNG(0x319a01)) as Box<() => number>;
  const gridRef = useRef<Uint8Array>(new Uint8Array(0)) as Box<Uint8Array>;
  const ageRef = useRef<Float32Array>(new Float32Array(0)) as Box<Float32Array>;
  const nRef = useRef(1) as Box<number>;
  const cellPxRef = useRef(4) as Box<number>;
  const centerRef = useRef({ cx: 0, cy: 0 }) as Box<{ cx: number; cy: number }>;
  const rRef = useRef(1) as Box<number>;
  const stuckRef = useRef(0) as Box<number>;
  const walkRef = useRef<Particle[]>([]) as Box<Particle[]>;
  const snowRef = useRef<Snow[]>([]) as Box<Snow[]>;
  const bgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const img2Ref = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState("0");
  const [still, setStill] = useState(false);
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

  function gridIdx(i: number, j: number): number { return i * nRef.current + j; }
  function inGrid(i: number, j: number): boolean {
    const N = nRef.current;
    return i >= 0 && j >= 0 && i < N && j < N;
  }
  function nbr(i: number, j: number, k: number): [number, number] {
    return [i + DI[k], j + ((j & 1) === 0 ? DJ_EVEN[k] : DJ_ODD[k])];
  }
  function setCell(i: number, j: number, t: number): void {
    gridRef.current[gridIdx(i, j)] = 1;
    ageRef.current[gridIdx(i, j)] = t;
  }

  function plantSeed(): void {
    const { cx, cy } = centerRef.current;
    setCell(cx, cy, 0); setCell(cx - 1, cy, 0); setCell(cx + 1, cy, 0);
    setCell(cx, cy - 1, 0); setCell(cx, cy + 1, 0);
    setCell(cx - 1, cy - 1, 0); setCell(cx + 1, cy + 1, 0);
    stuckRef.current = 7;
  }

  function launch(): void {
    const rand = randRef.current;
    const { cx, cy } = centerRef.current;
    const a = rand() * Math.PI * 2;
    const r = rRef.current * 1.22 + 3;
    const i = cx + Math.round(Math.cos(a) * r);
    const j = cy + Math.round(Math.sin(a) * r);
    if (!inGrid(i, j) || gridRef.current[gridIdx(i, j)]) return;
    walkRef.current.push([i, j, Math.floor(rand() * 6), rand() * Math.PI * 2]);
  }

  function touching(i: number, j: number): boolean {
    for (let k = 0; k < 6; k++) {
      const nb = nbr(i, j, k);
      if (inGrid(nb[0], nb[1]) && gridRef.current[gridIdx(nb[0], nb[1])]) return true;
    }
    return false;
  }

  function step(t: number): void {
    const rand = randRef.current;
    const { cx, cy } = centerRef.current;
    for (let s = 0; s < 20; s++) {
      const walk = walkRef.current;
      for (let w = walk.length - 1; w >= 0; w--) {
        const p = walk[w];
        if (rand() < 0.25) p[2] = Math.floor(rand() * 6);
        const nb = nbr(p[0], p[1], p[2]);
        const i = nb[0], j = nb[1];
        if (!inGrid(i, j)) { walk.splice(w, 1); continue; }
        if (rand() < 0.2) p[3] += (rand() - 0.5) * 0.7;
        p[0] = i; p[1] = j;
        if (touching(i, j)) {
          if (rand() < stickRef.current) {
            setCell(i, j, t);
            stuckRef.current++;
            const dc = Math.hypot(i - cx, (j - cy) * 0.92);
            if (dc + 2 > rRef.current) rRef.current = Math.min(nRef.current * 0.46, dc + 2);
          }
          walk.splice(w, 1);
        } else if (Math.hypot(i - cx, j - cy) > rRef.current * 1.7 + 8) {
          walk.splice(w, 1);
        }
      }
      while (walkRef.current.length < particlesRef.current) launch();
    }
  }

  function buildSnow(): void {
    const rand = randRef.current;
    const arr: Snow[] = [];
    for (let i = 0; i < 42; i++) {
      arr.push({
        x: rand(), y: rand(),
        r: 1.1 + rand() * 2.1,
        v: 0.055 + rand() * 0.11,
        sway: 0.012 + rand() * 0.03,
        ph: rand() * Math.PI * 2,
        tw: 0.6 + rand() * 0.9,
      });
    }
    snowRef.current = arr;
  }

  function buildPerm(): void {
    const rand = randRef.current;
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i2 = 255; i2 > 0; i2--) {
      const k2 = Math.floor(rand() * (i2 + 1));
      const tmp = p[i2]; p[i2] = p[k2]; p[k2] = tmp;
    }
    const perm = new Uint8Array(512);
    for (let i3 = 0; i3 < 512; i3++) perm[i3] = p[i3 & 255];
    permRef.current = perm;
  }
  function fade(k: number): number { return k * k * (3 - 2 * k); }
  function vnoise(x: number, y: number): number {
    const perm = permRef.current;
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a2 = perm[(perm[xi & 255] + yi) & 255];
    const b2 = perm[(perm[(xi + 1) & 255] + yi) & 255];
    const c2 = perm[(perm[xi & 255] + yi + 1) & 255];
    const d2 = perm[(perm[(xi + 1) & 255] + yi + 1) & 255];
    const u = fade(xf), v = fade(yf);
    return (a2 + (b2 - a2) * u + (c2 - a2) * v + (a2 - b2 - c2 + d2) * u * v) / 255;
  }

  function lerp(a: number, b: number, k: number): number { return a + (b - a) * k; }

  function drawBackdrop(t: number): void {
    const col = colRef.current;
    const bg = bgRef.current;
    if (!col || !bg) return;
    const { w: W, h: H } = sizeRef.current;
    const data = bg.data;
    const { cx, cy } = centerRef.current;
    const cellPx = cellPxRef.current;
    const pcx = (cx + 0.5) * cellPx, pcy = (cy + 0.5) * cellPx;
    const sc = 0.055;
    for (let y = 0; y < H; y++) {
      const u = y / H;
      const r0 = col.ink[0] + (col.deep[0] - col.ink[0]) * u;
      const g0 = col.ink[1] + (col.deep[1] - col.ink[1]) * u;
      const b0 = col.ink[2] + (col.deep[2] - col.ink[2]) * u;
      const dyv = y - pcy;
      for (let x = 0; x < W; x++) {
        const dxv = x - pcx;
        const d = Math.sqrt(dxv * dxv + dyv * dyv);
        const haze = Math.exp(-d * d / (W * W * 0.012)) * 30;
        const sh = (vnoise(x * sc, y * sc + t * 0.35) - 0.5) * 14;
        const j3 = (y * W + x) * 4;
        data[j3] = r0 + haze * (col.haze[0] / 255) + sh;
        data[j3 + 1] = g0 + haze * (col.haze[1] / 255) + sh;
        data[j3 + 2] = b0 + haze * (col.haze[2] / 255) + sh * 1.3;
      }
    }
  }

  function putc(px: number, py: number, c: RGB, alpha: number): void {
    const { w: W, h: H } = sizeRef.current;
    const img2 = img2Ref.current;
    if (!img2 || px < 0 || py < 0 || px >= W || py >= H) return;
    const data = img2.data;
    const j3 = (py * W + px) * 4;
    data[j3] += (c[0] - data[j3]) * alpha;
    data[j3 + 1] += (c[1] - data[j3 + 1]) * alpha;
    data[j3 + 2] += (c[2] - data[j3 + 2]) * alpha;
  }

  function cellColor(g: number, ag: number): RGB {
    const col = colRef.current!;
    const N = nRef.current;
    const k = Math.min(1, g / (N * 0.38));
    const base: RGB = [
      lerp(col.ice[0], col.lilac[0], k),
      lerp(col.ice[1], col.lilac[1], k),
      lerp(col.ice[2], col.lilac[2], k),
    ];
    if (ag < maxAgeRef.current) {
      const b = Math.pow(1 - ag / maxAgeRef.current, 1.6);
      base[0] += (col.glow[0] - base[0]) * (0.85 * b);
      base[1] += (col.glow[1] - base[1]) * (0.85 * b);
      base[2] += (col.glow[2] - base[2]) * (0.85 * b);
    }
    return base;
  }

  function draw(t: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const bg = bgRef.current;
    const img2 = img2Ref.current;
    if (!ctx || !col || !bg || !img2) return;
    const { w: W, h: H } = sizeRef.current;
    drawBackdrop(t);
    ctx.putImageData(bg, 0, 0);

    const data = bg.data, data2 = img2.data;
    const f = 1 - Math.exp(-dt * 4.2);
    for (let k = 0; k < data2.length; k += 4) {
      data2[k] += (data[k] - data2[k]) * f;
      data2[k + 1] += (data[k + 1] - data2[k + 1]) * f;
      data2[k + 2] += (data[k + 2] - data2[k + 2]) * f;
    }

    const N = nRef.current;
    const cellPx = cellPxRef.current;
    const { cx, cy } = centerRef.current;
    const ox = (W - N * cellPx) / 2, oy = (H - N * cellPx) / 2;
    const rr = Math.max(1, Math.round(cellPx * 0.58));
    const rr2 = rr * rr;
    const grid = gridRef.current, age = ageRef.current;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const gi = gridIdx(i, j);
        if (!grid[gi]) continue;
        const colr = cellColor(Math.hypot(i - cx, (j - cy) * 0.92), t - age[gi]);
        const px = Math.round(ox + i * cellPx + ((j & 1) ? cellPx * 0.5 : 0));
        const py = Math.round(oy + j * cellPx);
        for (let dy = -rr; dy <= rr; dy++) {
          for (let dx = -rr; dx <= rr; dx++) {
            const dd = dx * dx + dy * dy;
            if (dd > rr2) continue;
            const px2 = px + dx, py2 = py + dy;
            if (px2 < 0 || py2 < 0 || px2 >= W || py2 >= H) continue;
            const j3 = (py2 * W + px2) * 4;
            const a3 = 1 - dd / (rr2 + 1);
            data2[j3] += (colr[0] - data2[j3]) * a3;
            data2[j3 + 1] += (colr[1] - data2[j3 + 1]) * a3;
            data2[j3 + 2] += (colr[2] - data2[j3 + 2]) * a3;
          }
        }
      }
    }

    const walk = walkRef.current;
    for (let wi = 0; wi < walk.length; wi++) {
      const p = walk[wi];
      const px = Math.round(ox + p[0] * cellPx + ((p[1] & 1) ? cellPx * 0.5 : 0));
      const py = Math.round(oy + p[1] * cellPx);
      const tw = 0.55 + 0.45 * Math.sin(t * 7 + p[3] * 3);
      putc(px, py, col.mint, 0.95);
      putc(px + 1, py, col.mint, 0.5 * tw);
      putc(px - 1, py, col.mint, 0.5 * tw);
      putc(px, py + 1, col.mint, 0.5 * tw);
      putc(px, py - 1, col.mint, 0.9 * tw);
    }

    const snow = snowRef.current;
    for (let si = 0; si < snow.length; si++) {
      const s = snow[si];
      const sx = (s.x + Math.sin(t * s.sway * 6 + s.ph) * 0.035) * W;
      const sy = (((s.y + s.v * t) % 1.15) - 0.07) * H;
      const br = 0.5 + 0.5 * Math.sin(t * s.tw * 2.4 + s.ph);
      const a4 = 0.55 + 0.4 * br;
      const sr = Math.ceil(s.r);
      for (let dy2 = -sr; dy2 <= sr; dy2++) {
        for (let dx2 = -sr; dx2 <= sr; dx2++) {
          if (dx2 * dx2 + dy2 * dy2 > s.r * s.r) continue;
          putc(Math.round(sx) + dx2, Math.round(sy) + dy2, col.mote, a4);
        }
      }
    }
    ctx.putImageData(img2, 0, 0);
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d", { alpha: false });
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    sizeRef.current = { w: W, h: H };
    cv.width = W; cv.height = H;
    ctxRef.current = ctx;
    const cellPx = Math.max(3, Math.min(5, Math.floor(Math.min(W, H) / 42)));
    cellPxRef.current = cellPx;
    let N = Math.floor(Math.min(W, H) / cellPx);
    if ((N & 1) === 0) N -= 1;
    nRef.current = N;
    gridRef.current = new Uint8Array(N * N);
    ageRef.current = new Float32Array(N * N);
    walkRef.current = [];
    stuckRef.current = 0;
    rRef.current = 1;
    const cx = N >> 1, cy = N >> 1;
    centerRef.current = { cx, cy };
    const bg = ctx.createImageData(W, H);
    const img2 = ctx.createImageData(W, H);
    for (let k = 3; k < bg.data.length; k += 4) { bg.data[k] = 255; img2.data[k] = 255; }
    bgRef.current = bg;
    img2Ref.current = img2;
    plantSeed();
    buildSnow();
  }

  function stillFrame(): void {
    for (let k = 0; k < 240; k++) step(0.01 * k);
    draw(2.4, 0.016);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    step(t);
    draw(t, dt);
    setN(String(stuckRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    particlesRef.current = particles;
    stickRef.current = stick;
    maxAgeRef.current = maxAge;
    colRef.current = {
      ink: tokRGB(root, "--flake-ink"),
      deep: tokRGB(root, "--flake-deep"),
      haze: tokRGB(root, "--flake-haze"),
      mote: tokRGB(root, "--flake-mote"),
      ice: tokRGB(root, "--flake-ice"),
      glow: tokRGB(root, "--flake-glow"),
      lilac: tokRGB(root, "--flake-lilac"),
      mint: tokRGB(root, "--flake-mint"),
      mist: tokRGB(root, "--flake-mist"),
    };
    randRef.current = makePRNG(0x319a01);
    buildPerm();
    fit();
    setN("0");
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particles, stick, maxAge]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>바깥 원에서 날아든 입자가 위·아래·옆으로 무작위 걸음을 걷다가 결정에 닿는 순간 그대로 얼어붙는 규칙을 수천 번 반복하면, 씨앗 하나에서 육각 뾰족 클러스터가 저절로 자랍니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>개 응집 · 기본 DLA</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
