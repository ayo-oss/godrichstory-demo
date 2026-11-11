// SixFoldMirror — vanilla 판(run/319/demo/04-snowflake-six-fold-symmetry-mirror/index.html) 의 React 포트.
// 60도 섹터 하나에만 DLA 랜덤워크를 돌리고(각도를 60도 주기로 접어 부채꼴 밖을 안으로 되돌린다),
// 붙은 셀을 화면에 그릴 때 회전 COPIES + 거울(±각) 도장으로 펼친다 — 계산은 1/6, 대칭은 완벽.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SixFoldMirror.module.scss";

export type SixFoldMirrorProps = {
  duration?: string;
  easing?: string;
  color?: string;
  sectorDeg?: number;   // 섹터 각(도) — 변형 "대칭 접기" 축(60 → 30)
  sps?: number;         // 초당 응집 입자 수 — 변형 "여섯 배 속도" 축(90 → 320)
  n?: number;           // 섹터 격자 반경(셀 수)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Walker = { fx: number; fy: number };
type Mote = { x: number; y: number; c: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; halo: RGB; mint: RGB; sky: RGB; mist: RGB };

const FIELD_LABEL = "육중 대칭 결정 실험판";

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

export default function SixFoldMirror({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b8cce8",
  sectorDeg = 60,
  sps = 320,
  n = 44,
}: SixFoldMirrorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const lutRef = useRef<{ r: Uint8ClampedArray; g: Uint8ClampedArray; b: Uint8ClampedArray } | null>(null);
  const randRef = useRef<() => number>(makePRNG(0x3190404)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [copiesShown] = useState(Math.round(360 / sectorDeg) * 2);
  const [spsShown] = useState(sps);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  // ── 섹터 상태(ref 로 보관 — rAF 루프에서만 갱신, 리렌더 유발 안 함) ──
  const SECTOR = (sectorDeg * Math.PI) / 180;
  const COPIES = Math.round(360 / sectorDeg);
  const WS = 2 * n + 8, HS = n + 6, AX = n + 4, AY = 2;
  const occRef = useRef<Uint8Array>(new Uint8Array(WS * HS)) as Box<Uint8Array>;
  const cellsRef = useRef<number[]>([]) as Box<number[]>;
  const orderRef = useRef(0) as Box<number>;
  const maxRRef = useRef(1.5) as Box<number>;
  const phaseRef = useRef(0) as Box<number>;
  const shineTRef = useRef(0) as Box<number>;
  const walkersRef = useRef<Walker[]>([]) as Box<Walker[]>;
  const gRotRef = useRef(0) as Box<number>;
  const frRef = useRef(0) as Box<number>;
  const motesRef = useRef<Mote[]>([]) as Box<Mote[]>;
  const WALKERS = 42, MOTES = 90;

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
    const m = [0, 0.30, 0.60, 0.86, 1];
    const cs: RGB[] = [
      col.ink,
      [col.ink[0] + (col.dusk[0] - col.ink[0]) * 0.7, col.ink[1] + (col.dusk[1] - col.ink[1]) * 0.7, col.ink[2] + (col.dusk[2] - col.ink[2]) * 0.7],
      col.halo,
      col.core,
      [255, 253, 255],
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

  function foldTh(th: number): number {
    const P = SECTOR;
    let m = (th + P * 0.5) % P;
    if (m < 0) m += P;
    return m - P * 0.5;
  }
  function fold(fx: number, fy: number): [number, number] {
    const r = Math.sqrt(fx * fx + fy * fy);
    const th = r < 1e-9 ? 0 : foldTh(Math.atan2(fx, fy));
    return [th, r];
  }
  function cellOcc(fx: number, fy: number): number {
    const occ = occRef.current;
    const fo = fold(fx, fy);
    if (fo[1] > n) return 0;
    const gx = AX + Math.round(Math.sin(fo[0]) * fo[1]);
    const gy = AY + Math.round(Math.cos(fo[0]) * fo[1]);
    if (gx < 1 || gx >= WS - 1 || gy < 1 || gy >= HS - 1) return 0;
    return occ[gy * WS + gx];
  }
  function respawn(w: Walker): void {
    const rand = randRef.current;
    const r0 = Math.min(maxRRef.current + 12, n - 1);
    const a = (rand() * 2 - 1) * (SECTOR * 0.46);
    w.fx = Math.sin(a) * r0;
    w.fy = Math.cos(a) * r0;
  }
  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  function stepWalker(w: Walker): boolean {
    const rand = randRef.current;
    const occ = occRef.current;
    const d = (rand() * 4) | 0;
    w.fx += DX[d]; w.fy += DY[d];
    const fo = fold(w.fx, w.fy);
    if (fo[1] > n) { respawn(w); return false; }
    const gx = AX + Math.round(Math.sin(fo[0]) * fo[1]);
    const gy = AY + Math.round(Math.cos(fo[0]) * fo[1]);
    if (gx < 1 || gx >= WS - 1 || gy < 1 || gy >= HS - 1) { respawn(w); return false; }
    const idx = gy * WS + gx;
    if (occ[idx]) return false;
    const nc = cellOcc(w.fx + 1, w.fy) + cellOcc(w.fx - 1, w.fy) + cellOcc(w.fx, w.fy + 1) + cellOcc(w.fx, w.fy - 1);
    if (!nc) return false;
    const p = nc === 1 ? 1.0 : nc === 2 ? 0.62 : nc === 3 ? 0.22 : 0.10;
    if (rand() >= p) { respawn(w); return false; }
    occ[idx] = 1;
    cellsRef.current.push(fo[0], fo[1], orderRef.current);
    orderRef.current++;
    if (fo[1] > maxRRef.current) maxRRef.current = fo[1];
    respawn(w);
    return true;
  }
  function resetSim(): void {
    occRef.current.fill(0);
    cellsRef.current = [];
    orderRef.current = 0;
    maxRRef.current = 3;
    phaseRef.current = 0;
    shineTRef.current = 0;
    for (let s = 1; s <= 3; s++) {
      occRef.current[(AY + s) * WS + AX] = 1;
      cellsRef.current.push(0, s, orderRef.current);
      orderRef.current++;
    }
    const ws: Walker[] = [];
    for (let i = 0; i < WALKERS; i++) { const w: Walker = { fx: 0, fy: 0 }; respawn(w); ws.push(w); }
    walkersRef.current = ws;
  }

  function spawnMote(m: Mote, edge: boolean): void {
    const rand = randRef.current;
    const { w: W, h: H } = sizeRef.current;
    const side = (rand() * 4) | 0;
    if (side === 0) { m.x = rand() * W; m.y = edge ? -4 : rand() * H; }
    else if (side === 1) { m.x = edge ? W + 4 : rand() * W; m.y = rand() * H; }
    else if (side === 2) { m.x = rand() * W; m.y = edge ? H + 4 : rand() * H; }
    else { m.x = edge ? -4 : rand() * W; m.y = rand() * H; }
    m.c = rand();
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
    const img = ctx.createImageData(W, H);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = 255;
    imgRef.current = img;
    randRef.current = makePRNG(0x3190404);
    gRotRef.current = 0;
    frRef.current = 0;
    const ms: Mote[] = [];
    for (let m = 0; m < MOTES; m++) { const mo: Mote = { x: 0, y: 0, c: 0 }; spawnMote(mo, false); ms.push(mo); }
    motesRef.current = ms;
    resetSim();
  }

  function sim(dt: number): void {
    if (phaseRef.current === 1) {
      shineTRef.current += dt;
      if (shineTRef.current > 950) resetSim();
      return;
    }
    const quota = (sps * dt) / 1000;
    let stuck = 0, steps = 0;
    const maxSteps = (dt / 16.7) * WALKERS * 9;
    const walkers = walkersRef.current;
    while (stuck < quota && steps < maxSteps) {
      for (let i = 0; i < walkers.length; i++) {
        if (stepWalker(walkers[i])) stuck++;
        steps++;
        if (stuck >= quota || steps >= maxSteps) break;
      }
    }
    if (maxRRef.current > n - 2) { phaseRef.current = 1; shineTRef.current = 0; }
  }

  function stamp(px: number, py: number, R: number, G: number, B: number, a: number): void {
    const img = imgRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!img) return;
    const x = px | 0, y = py | 0;
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const j = (y * W + x) << 2, d = img.data;
    d[j] = d[j] * (1 - a) + R * a;
    d[j + 1] = d[j + 1] * (1 - a) + G * a;
    d[j + 2] = d[j + 2] * (1 - a) + B * a;
  }
  function stampSoft(px: number, py: number, R: number, G: number, B: number, a: number): void {
    const col = colRef.current;
    if (!col) return;
    const x = px | 0, y = py | 0;
    for (let yy = y - 2; yy <= y + 2; yy++)
      for (let xx = x - 2; xx <= x + 2; xx++)
        stamp(xx, yy, col.halo[0], col.halo[1], col.halo[2], a * 0.10);
    for (let y2 = y - 1; y2 <= y + 1; y2++)
      for (let x2 = x - 1; x2 <= x + 1; x2++)
        stamp(x2, y2, R, G, B, a * 0.42);
    stamp(x, y, R, G, B, Math.min(1, a));
  }

  function compose(): void {
    const ctx = ctxRef.current;
    const img = imgRef.current;
    const col = colRef.current;
    const lut = lutRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !img || !col || !lut) return;
    const d = img.data;
    const fr = frRef.current;
    const topR = col.ink[0] + 6, topG = col.ink[1] + 6, topB = col.ink[2] + 9;
    const botR = col.ink[0] + (col.dusk[0] - col.ink[0]) * 0.34, botG = col.ink[1] + (col.dusk[1] - col.ink[1]) * 0.34, botB = col.ink[2] + (col.dusk[2] - col.ink[2]) * 0.34;
    const a1x = W * (0.18 + 0.10 * Math.sin(fr * 0.011)), a1y = H * (0.24 + 0.12 * Math.cos(fr * 0.013));
    const a2x = W * (0.84 + 0.09 * Math.cos(fr * 0.009)), a2y = H * (0.28 + 0.10 * Math.sin(fr * 0.015));
    const a3x = W * (0.24 + 0.08 * Math.cos(fr * 0.012 + 2)), a3y = H * (0.82 + 0.09 * Math.sin(fr * 0.010 + 1));
    const a4x = W * (0.78 + 0.10 * Math.sin(fr * 0.008 + 4)), a4y = H * (0.78 + 0.11 * Math.cos(fr * 0.014 + 3));
    const p1 = 0.085 + 0.050 * Math.sin(fr * 0.021);
    const p2 = 0.075 + 0.045 * Math.cos(fr * 0.017);
    const p3 = 0.070 + 0.040 * Math.sin(fr * 0.019 + 2);
    const p4 = 0.080 + 0.048 * Math.cos(fr * 0.016 + 1);
    const sig = 1 / (H * H * 0.55);
    for (let y = 0; y < H; y++) {
      const ty = y / H;
      const br = topR + (botR - topR) * ty, bg = topG + (botG - topG) * ty, bb = topB + (botB - topB) * ty;
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const dx1 = x - a1x, dy1 = y - a1y, dx2 = x - a2x, dy2 = y - a2y;
        const dx3 = x - a3x, dy3 = y - a3y, dx4 = x - a4x, dy4 = y - a4y;
        const g = p1 * Math.exp(-(dx1 * dx1 + dy1 * dy1) * sig)
                + p2 * Math.exp(-(dx2 * dx2 + dy2 * dy2) * sig)
                + p3 * Math.exp(-(dx3 * dx3 + dy3 * dy3) * sig)
                + p4 * Math.exp(-(dx4 * dx4 + dy4 * dy4) * sig);
        const j = (row + x) << 2;
        d[j] = br + (col.halo[0] - br) * g;
        d[j + 1] = bg + (col.halo[1] - bg) * g;
        d[j + 2] = bb + (col.halo[2] - bb) * g;
      }
    }
    const cx = W / 2, cy = H / 2;
    const scale = (Math.min(W, H) / 2 - 8) / n;
    const shineWave = phaseRef.current === 1 ? shineTRef.current * 0.018 : 0;
    const cells = cellsRef.current;
    const order = orderRef.current;
    const gRot = gRotRef.current;
    for (let i = 0; i < cells.length; i += 3) {
      const th = cells[i], r = cells[i + 1], q = order > 1 ? cells[i + 2] / order : 1;
      let li = 0.40 + 0.60 * q;
      if (phaseRef.current === 1) li += 0.30 * Math.sin(shineWave - r * 0.22);
      if (li < 0) li = 0; else if (li > 1) li = 1;
      const ci = (li * 255) | 0;
      const R = lut.r[ci], G = lut.g[ci], B = lut.b[ci];
      const rr = r * scale;
      for (let k = 0; k < COPIES; k++) {
        const base = gRot + k * SECTOR;
        stampSoft(cx + rr * Math.sin(base + th), cy + rr * Math.cos(base + th), R, G, B, 0.85);
        stampSoft(cx + rr * Math.sin(base - th), cy + rr * Math.cos(base - th), R, G, B, 0.85);
      }
    }
    const rand = randRef.current;
    const motes = motesRef.current;
    for (let m = 0; m < motes.length; m++) {
      const mo = motes[m];
      const ddx = cx - mo.x, ddy = cy - mo.y, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      const sp = 0.05 + mo.c * 0.05;
      mo.x += (ddx / dd) * sp + (rand() - 0.5) * 1.5;
      mo.y += (ddy / dd) * sp + (rand() - 0.5) * 1.5;
      if (dd < 12) spawnMote(mo, true);
      const mc = mo.c < 0.34 ? col.mint : mo.c < 0.67 ? col.sky : col.mist;
      const ma = 0.34 + 0.22 * Math.sin(fr * 0.09 + m * 1.7);
      stamp(mo.x, mo.y, mc[0], mc[1], mc[2], ma);
      stamp(mo.x + 1, mo.y, mc[0], mc[1], mc[2], ma * 0.45);
      stamp(mo.x, mo.y + 1, mc[0], mc[1], mc[2], ma * 0.45);
    }
    ctx.putImageData(img, 0, 0);
  }

  let prev = 0;
  function frame(now: number): void {
    const dt = Math.min(50, now - (prev || now));
    prev = now;
    gRotRef.current += dt * 0.00022;
    sim(dt);
    compose();
    frRef.current++;
    rafRef.current = requestAnimationFrame(frame);
  }
  function stillDraw(): void {
    fit();
    for (let i = 0; i < 42; i++) sim(33);
    gRotRef.current = 0.3;
    compose();
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    colRef.current = {
      ink: tokRGB(root, "--flake-ink"),
      dusk: tokRGB(root, "--flake-dusk"),
      core: tokRGB(root, "--flake-core"),
      halo: tokRGB(root, "--flake-halo"),
      mint: tokRGB(root, "--flake-mint"),
      sky: tokRGB(root, "--flake-sky"),
      mist: tokRGB(root, "--flake-mist"),
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
  }, [sectorDeg, sps, n]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth={22} strokeLinecap="round"><path d="M128 28v200"/><path d="M45 76l166 104"/><path d="M211 76L45 180"/></g></svg>
          <span>60도 부채꼴 섹터 하나만 시뮬레이션하고 나머지를 회전·거울 복사합니다 — 계산은 1/6, 대칭은 어긋나지 않는 육각 결정이 자랍니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>섹터 <b className={styles.val}>{sectorDeg}°</b> · 도장 <b className={styles.val}>{copiesShown}</b> · 응집 <b className={styles.val}>{spsShown}</b>/초</span>
          <span className={styles.metaDim}>캔버스 · rotate · ImageData</span>
        </div>
      </div>
    </main>
  );
}
