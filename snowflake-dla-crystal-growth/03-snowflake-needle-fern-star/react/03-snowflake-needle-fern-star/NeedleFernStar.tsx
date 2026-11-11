// NeedleFernStar — vanilla 판(run/319/demo/03-snowflake-needle-fern-star/index.html) 의 React 포트.
// 침·고사리 결정 — 같은 DLA 규칙에 팁 편향 지수(가지 폭 확률) 하나만 달리한 두 결정을
// 좌우로 나란히 동시에 키운다. 좌(bias 1.6)는 넓은 고사리 잎, 우(bias 4.6)는 가늘고 긴 침.
// 실제 눈결정 형성 지도(Nakaya 다이어그램)의 축 하나를 파라미터로 압축한 대비 시연.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NeedleFernStar.module.scss";

export type NeedleFernStarProps = {
  duration?: string;
  easing?: string;
  color?: string;
  biasFern?: number;    // 좌(고사리) 팁 편향 지수 — 낮을수록 폭이 넓고 잎이 무성
  biasNeedle?: number;  // 우(침) 팁 편향 지수 — 높을수록 가늘고 긴 바늘
  maxAge?: number;      // 방금 붙은 칸이 빛나는 시간(초)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Particle = [number, number, number, number];
type Snow = { x: number; y: number; r: number; v: number; sway: number; ph: number; tw: number };
type Colors = { ink: RGB; deep: RGB; haze: RGB; mote: RGB; ice: RGB; glow: RGB; lilac: RGB; mint: RGB; sand: RGB; mist: RGB };
type Crystal = {
  N: number; ox: number; bias: number;
  grid: Uint8Array; age: Float32Array;
  walk: Particle[];
  rand: () => number;
  stuck: number; r: number;
  cx: number; cy: number;
};

const FIELD_LABEL = "침·고사리 결정 대비 실험판";
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

export default function NeedleFernStar({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#c9b6ff",
  biasFern = 1.6,
  biasNeedle = 4.6,
  maxAge = 0.55,
}: NeedleFernStarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const biasFernRef = useRef(biasFern) as Box<number>;
  const biasNeedleRef = useRef(biasNeedle) as Box<number>;
  const maxAgeRef = useRef(maxAge) as Box<number>;
  const randRef = useRef(makePRNG(0x319a03)) as Box<() => number>;
  const lRef = useRef<Crystal | null>(null) as Box<Crystal | null>;
  const rRef2 = useRef<Crystal | null>(null) as Box<Crystal | null>;
  const cellPxRef = useRef(4) as Box<number>;
  const snowRef = useRef<Snow[]>([]) as Box<Snow[]>;
  const bgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const img2Ref = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const permRef = useRef<Uint8Array>(new Uint8Array(512)) as Box<Uint8Array>;
  const rafRef = useRef(0) as Box<number>;
  const [nl, setNl] = useState("0");
  const [nr, setNr] = useState("0");
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

  function makeCrystal(n: number, ox: number, bias: number, seed: number): Crystal {
    return {
      N: n, ox, bias,
      grid: new Uint8Array(n * n),
      age: new Float32Array(n * n),
      walk: [],
      rand: makePRNG(seed),
      stuck: 0, r: 1,
      cx: n >> 1, cy: n >> 1,
    };
  }

  function gridIdx(c: Crystal, i: number, j: number): number { return i * c.N + j; }
  function inGrid(c: Crystal, i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < c.N && j < c.N;
  }
  function nbr(c: Crystal, i: number, j: number, k: number): [number, number] {
    return [i + DI[k], j + ((j & 1) === 0 ? DJ_EVEN[k] : DJ_ODD[k])];
  }
  function setCell(c: Crystal, i: number, j: number, t: number): void {
    c.grid[gridIdx(c, i, j)] = 1;
    c.age[gridIdx(c, i, j)] = t;
  }

  function plantSeed(c: Crystal): void {
    const cx = c.cx, cy = c.cy;
    setCell(c, cx, cy, 0); setCell(c, cx - 1, cy, 0); setCell(c, cx + 1, cy, 0);
    setCell(c, cx, cy - 1, 0); setCell(c, cx, cy + 1, 0);
    setCell(c, cx - 1, cy - 1, 0); setCell(c, cx + 1, cy + 1, 0);
    c.stuck = 7;
  }

  function launch(c: Crystal): void {
    const rnd = c.rand;
    const a = rnd() * Math.PI * 2;
    const r = c.r * 1.22 + 3;
    const i = c.cx + Math.round(Math.cos(a) * r);
    const j = c.cy + Math.round(Math.sin(a) * r);
    if (!inGrid(c, i, j) || c.grid[gridIdx(c, i, j)]) return;
    c.walk.push([i, j, Math.floor(rnd() * 6), rnd() * Math.PI * 2]);
  }

  function touching(c: Crystal, i: number, j: number): boolean {
    for (let k = 0; k < 6; k++) {
      const nb = nbr(c, i, j, k);
      if (inGrid(c, nb[0], nb[1]) && c.grid[gridIdx(c, nb[0], nb[1])]) return true;
    }
    return false;
  }

  function stickProb(c: Crystal, i: number, j: number): number {
    const dc = Math.hypot(i - c.cx, (j - c.cy) * 0.92);
    const k = Math.min(1, dc / Math.max(1, c.r));
    return Math.pow(k, 1) * 0.15 + Math.pow(k, c.bias) * 0.85 + 0.05;
  }

  function step(c: Crystal, t: number): void {
    const rnd = c.rand;
    for (let s = 0; s < 20; s++) {
      for (let w = c.walk.length - 1; w >= 0; w--) {
        const p = c.walk[w];
        if (rnd() < 0.25) p[2] = Math.floor(rnd() * 6);
        const nb = nbr(c, p[0], p[1], p[2]);
        const i = nb[0], j = nb[1];
        if (!inGrid(c, i, j)) { c.walk.splice(w, 1); continue; }
        if (rnd() < 0.2) p[3] += (rnd() - 0.5) * 0.7;
        p[0] = i; p[1] = j;
        if (touching(c, i, j)) {
          if (rnd() < stickProb(c, i, j)) {
            setCell(c, i, j, t);
            c.stuck++;
            const dc = Math.hypot(i - c.cx, (j - c.cy) * 0.92);
            if (dc + 2 > c.r) c.r = Math.min(c.N * 0.46, dc + 2);
          }
        } else if (Math.hypot(i - c.cx, j - c.cy) > c.r * 1.7 + 8) {
          c.walk.splice(w, 1);
        }
      }
      while (c.walk.length < 22) launch(c);
    }
  }

  function buildSnow(): void {
    const rand = randRef.current;
    const arr: Snow[] = [];
    for (let i = 0; i < 60; i++) {
      arr.push({
        x: rand(), y: rand(),
        r: 1.1 + rand() * 2.2,
        v: 0.06 + rand() * 0.13,
        sway: 0.013 + rand() * 0.032,
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
    const sc = 0.055;
    for (let y = 0; y < H; y++) {
      const u = y / H;
      const r0 = col.ink[0] + (col.deep[0] - col.ink[0]) * u;
      const g0 = col.ink[1] + (col.deep[1] - col.ink[1]) * u;
      const b0 = col.ink[2] + (col.deep[2] - col.ink[2]) * u;
      for (let x = 0; x < W; x++) {
        const sh = (vnoise(x * sc, y * sc + t * 0.35) - 0.5) * 16;
        const j3 = (y * W + x) * 4;
        data[j3] = r0 + sh;
        data[j3 + 1] = g0 + sh;
        data[j3 + 2] = b0 + sh * 1.3;
      }
    }
    const halves: [Crystal | null, number][] = [[lRef.current, W * 0.27], [rRef2.current, W * 0.73]];
    for (let h = 0; h < 2; h++) {
      const c = halves[h][0];
      if (!c) continue;
      const pcx = halves[h][1], pcy = H * 0.5;
      for (let y2 = 0; y2 < H; y2 += 2) {
        const dyv = y2 - pcy;
        for (let x2 = Math.max(0, pcx - W * 0.28); x2 < Math.min(W, pcx + W * 0.28); x2 += 2) {
          const dxv = x2 - pcx;
          const d2 = dxv * dxv + dyv * dyv;
          const haze = Math.exp(-d2 / (W * W * 0.008)) * 24;
          for (let yy = y2; yy < Math.min(H, y2 + 2); yy++) {
            for (let xx = x2; xx < Math.min(W, x2 + 2); xx++) {
              const j4 = (yy * W + xx) * 4;
              data[j4] += haze * (col.haze[0] / 255);
              data[j4 + 1] += haze * (col.haze[1] / 255);
              data[j4 + 2] += haze * (col.haze[2] / 255);
            }
          }
        }
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

  function cellColor(c: Crystal, g: number, ag: number, outer: RGB): RGB {
    const col = colRef.current!;
    const k = Math.min(1, g / (c.N * 0.38));
    const base: RGB = [
      lerp(col.ice[0], outer[0], k),
      lerp(col.ice[1], outer[1], k),
      lerp(col.ice[2], outer[2], k),
    ];
    if (ag < maxAgeRef.current) {
      const b = Math.pow(1 - ag / maxAgeRef.current, 1.6);
      base[0] += (col.glow[0] - base[0]) * (0.85 * b);
      base[1] += (col.glow[1] - base[1]) * (0.85 * b);
      base[2] += (col.glow[2] - base[2]) * (0.85 * b);
    }
    return base;
  }

  function drawCrystal(c: Crystal, t: number, outer: RGB): void {
    const { w: W, h: H } = sizeRef.current;
    const cellPx = cellPxRef.current;
    const ox = c.ox, oy = (H - c.N * cellPx) / 2;
    const rr = Math.max(1, Math.round(cellPx * 0.58));
    const rr2 = rr * rr;
    for (let i = 0; i < c.N; i++) {
      for (let j = 0; j < c.N; j++) {
        const gi = gridIdx(c, i, j);
        if (!c.grid[gi]) continue;
        const colr = cellColor(c, Math.hypot(i - c.cx, (j - c.cy) * 0.92), t - c.age[gi], outer);
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
            const data2 = img2Ref.current!.data;
            data2[j3] += (colr[0] - data2[j3]) * a3;
            data2[j3 + 1] += (colr[1] - data2[j3 + 1]) * a3;
            data2[j3 + 2] += (colr[2] - data2[j3 + 2]) * a3;
          }
        }
      }
    }
    for (let wi = 0; wi < c.walk.length; wi++) {
      const p = c.walk[wi];
      const px = Math.round(ox + p[0] * cellPx + ((p[1] & 1) ? cellPx * 0.5 : 0));
      const py = Math.round(oy + p[1] * cellPx);
      const tw = 0.55 + 0.45 * Math.sin(t * 7 + p[3] * 3);
      putc(px, py, colRef.current!.mint, 0.95);
      putc(px + 1, py, colRef.current!.mint, 0.5 * tw);
      putc(px - 1, py, colRef.current!.mint, 0.5 * tw);
      putc(px, py + 1, colRef.current!.mint, 0.5 * tw);
      putc(px, py - 1, colRef.current!.mint, 0.9 * tw);
    }
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

    drawCrystal(lRef.current!, t, col.lilac);
    drawCrystal(rRef2.current!, t, col.sand);

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
    const mx = Math.round(W / 2);
    for (let y3 = 0; y3 < H; y3++) {
      putc(mx, y3, col.mist, 0.1 + 0.06 * Math.sin(t * 1.4 + y3 * 0.05));
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
    const cellPx = Math.max(2, Math.min(4, Math.floor(Math.min(W / 2, H) / 46)));
    cellPxRef.current = cellPx;
    let N = Math.floor(Math.min(W / 2, H) / cellPx);
    if ((N & 1) === 0) N -= 1;
    lRef.current = makeCrystal(N, (W / 2 - N * cellPx) / 2, biasFernRef.current, 0x319b01);
    rRef2.current = makeCrystal(N, W / 2 + (W / 2 - N * cellPx) / 2, biasNeedleRef.current, 0x319b02);
    plantSeed(lRef.current);
    plantSeed(rRef2.current);
    const bg = ctx.createImageData(W, H);
    const img2 = ctx.createImageData(W, H);
    for (let k = 3; k < bg.data.length; k += 4) { bg.data[k] = 255; img2.data[k] = 255; }
    bgRef.current = bg;
    img2Ref.current = img2;
    buildSnow();
  }

  function stillFrame(): void {
    for (let k = 0; k < 240; k++) {
      step(lRef.current!, 0.01 * k);
      step(rRef2.current!, 0.01 * k);
    }
    draw(2.4, 0.016);
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now;
    step(lRef.current!, t);
    step(rRef2.current!, t);
    draw(t, dt);
    setNl(String(lRef.current!.stuck));
    setNr(String(rRef2.current!.stuck));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    biasFernRef.current = biasFern;
    biasNeedleRef.current = biasNeedle;
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
      sand: tokRGB(root, "--flake-sand"),
      mist: tokRGB(root, "--flake-mist"),
    };
    randRef.current = makePRNG(0x319a03);
    buildPerm();
    fit();
    setNl("0"); setNr("0");
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
  }, [biasFern, biasNeedle, maxAge]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>같은 응집 규칙에 파라미터 하나(가지 폭 확률)만 달리한 두 결정을 나란히 키우면, 넓은 고사리형 잎과 좁은 침형이 한 화면에서 갈라집니다 — 진짜 눈결정이 온도·습도 조건에 따라 모양이 갈리는 지도입니다</span>
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
          <span className={styles.meta}>좌 <b className={styles.val}>{nl}</b> · 우 <b className={styles.valAlt}>{nr}</b>개 응집</span>
          <span className={styles.metaDim}>canvas · ImageData · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
