// FrostWindowPane — vanilla 판(run/319/demo/05-snowflake-frost-window-pane/index.html) 의 React 포트.
// 창틀 네 변 전체를 씨앗으로 깔고 온도 필드(가장자리=잘 얼고 → 중심=얼기 어려운 역방향 그라디언트)를
// 확률에 반영한 DLA 랜덤워크 — 서리가 유리창 가장자리에서 안쪽으로 프랙탈로 기어드는 진짜 모양.
// 격자(저해상도) 점유를 ImageData 한 장에 그려 확대해 붙이고 결빛 스윕이 지나간다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FrostWindowPane.module.scss";

export type FrostWindowPaneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  gw?: number;   // 격자 폭(셀 수) — 변형 "결의 촘촘함" 축(72 ↔ 96)
  sps?: number;  // 초당 응집 셀 수 — 변형 "번지는 속도" 축(1400 ↔ 3600)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Walker = { gx: number; gy: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; halo: RGB; mist: RGB };

const FIELD_LABEL = "서리 낀 창 실험판";

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

export default function FrostWindowPane({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b8cce8",
  gw = 72,
  sps = 2600,
}: FrostWindowPaneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const gimgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const gctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const randRef = useRef<() => number>(makePRNG(0x3190405)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [gridShown] = useState(`${gw}×${Math.round(gw * 0.625)}`);
  const [spsShown] = useState(sps);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  // ── 서리 상태(ref 로 보관 — rAF 루프에서만 갱신, 리렌더 유발 안 함) ──
  const GH = Math.round(gw * 0.625);
  const COLD = 0.34;
  const BIAS = 0.55;
  const occRef = useRef<Uint8Array>(new Uint8Array(gw * GH)) as Box<Uint8Array>;
  const noiseRef = useRef<Float32Array>(new Float32Array(gw * GH)) as Box<Float32Array>;
  const filledRef = useRef(0) as Box<number>;
  const phaseRef = useRef(0) as Box<number>;
  const shineTRef = useRef(0) as Box<number>;
  const walkersRef = useRef<Walker[]>([]) as Box<Walker[]>;
  const frRef = useRef(0) as Box<number>;
  const maxDistRef = useRef(1) as Box<number>;
  const WALKERS = 60;

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

  function idx(gx: number, gy: number): number {
    return gy * gw + gx;
  }
  function edgeDist(gx: number, gy: number): number {
    return Math.min(gx, gy, gw - 1 - gx, GH - 1 - gy);
  }

  function respawn(w: Walker): void {
    const rand = randRef.current;
    let tries = 0;
    do {
      w.gx = 1 + ((rand() * (gw - 2)) | 0);
      w.gy = 1 + ((rand() * (GH - 2)) | 0);
      tries++;
    } while (occRef.current[idx(w.gx, w.gy)] && tries < 40);
  }

  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  // 방향 index: 0=+x · 1=-x · 2=+y · 3=-y
  function stepWalker(w: Walker): boolean {
    const rand = randRef.current;
    const occ = occRef.current;
    let d: number;
    if (rand() < BIAS) {
      // 온도 필드 드리프트 — 가장 가까운 창틀로 한 걸음
      const dl = w.gx, dr = gw - 1 - w.gx, dt = w.gy, db = GH - 1 - w.gy;
      const m = Math.min(dl, dr, dt, db);
      d = m === dl ? 1 : m === dr ? 0 : m === dt ? 3 : 2;
    } else {
      d = (rand() * 4) | 0;   // 무작위 걸음 — 이게 없으면 가지가 안 갈라진다
    }
    const nx = w.gx + DX[d], ny = w.gy + DY[d];
    if (nx < 0 || nx >= gw || ny < 0 || ny >= GH) { respawn(w); return false; }
    w.gx = nx; w.gy = ny;
    const i = idx(nx, ny);
    if (occ[i]) return false;
    const nc = (nx > 0 && occ[idx(nx - 1, ny)] ? 1 : 0) + (nx < gw - 1 && occ[idx(nx + 1, ny)] ? 1 : 0) +
              (ny > 0 && occ[idx(nx, ny - 1)] ? 1 : 0) + (ny < GH - 1 && occ[idx(nx, ny + 1)] ? 1 : 0);
    if (!nc) return false;
    // 온도 필드 — 중심에 가까울수록 차가워 얼기 어렵다
    const dist = Math.min(1, edgeDist(nx, ny) / maxDistRef.current);
    const temp = 1 - dist * COLD;
    const p = (nc === 1 ? 1.0 : nc === 2 ? 0.58 : nc === 3 ? 0.24 : 0.12) * temp;
    if (rand() >= p) return false;
    occ[i] = 1;
    filledRef.current++;
    respawn(w);
    return true;
  }

  function resetSim(): void {
    const occ = occRef.current;
    occ.fill(0);
    for (let x = 0; x < gw; x++) { occ[idx(x, 0)] = 1; occ[idx(x, GH - 1)] = 1; }
    for (let y = 0; y < GH; y++) { occ[idx(0, y)] = 1; occ[idx(gw - 1, y)] = 1; }
    filledRef.current = 2 * (gw + GH) - 4;
    phaseRef.current = 0;
    shineTRef.current = 0;
    const ws: Walker[] = [];
    for (let i = 0; i < WALKERS; i++) { const w = { gx: 1, gy: 1 }; respawn(w); ws.push(w); }
    walkersRef.current = ws;
  }

  function sim(dt: number): void {
    if (phaseRef.current === 1) {
      shineTRef.current += dt;
      if (shineTRef.current > 650) resetSim();
      return;
    }
    const quota = sps * dt / 1000;
    let stuck = 0, steps = 0;
    const maxSteps = 400000;
    const t0 = performance.now(), budgetMs = 9;
    while (stuck < quota && steps < maxSteps) {
      const ws = walkersRef.current;
      for (let i = 0; i < ws.length; i++) {
        if (stepWalker(ws[i])) stuck++;
        steps++;
        if (stuck >= quota) break;
      }
      if ((steps & 2047) === 0 && performance.now() - t0 > budgetMs) break;
    }
    if (filledRef.current > gw * GH * 0.62) { phaseRef.current = 1; shineTRef.current = 0; }
  }

  function fit(): void {
    const field = fieldRef.current, cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.max(2, Math.round(r.width));
    const H = Math.max(2, Math.round(r.height));
    sizeRef.current = { w: W, h: H };
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    const img = ctx.createImageData(W, H);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
    imgRef.current = img;
    const gcanvas = document.createElement("canvas");
    gcanvas.width = gw; gcanvas.height = GH;
    const gctx = gcanvas.getContext("2d");
    if (!gctx) return;
    gctxRef.current = gctx;
    const gimg = gctx.createImageData(gw, GH);
    for (let j = 3; j < gimg.data.length; j += 4) gimg.data[j] = 255;
    gimgRef.current = gimg;
    const cx0 = (gw - 1) / 2, cy0 = (GH - 1) / 2;
    maxDistRef.current = Math.sqrt(cx0 * cx0 + cy0 * cy0);
    randRef.current = makePRNG(0x3190405);
    const noise = noiseRef.current;
    for (let ni = 0; ni < noise.length; ni++) noise[ni] = randRef.current();
    resetSim();
  }

  // 격자 점유 → 작은 캔버스 ImageData → 큰 캔버스에 확대해 얹는다
  function drawGrid(): void {
    const gimg = gimgRef.current, occ = occRef.current, noise = noiseRef.current, col = colRef.current;
    if (!gimg || !col) return;
    const gd = gimg.data;
    const fr = frRef.current;
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const i = gy * gw + gx, j = i << 2;
        if (!occ[i]) { gd[j] = col.ink[0]; gd[j + 1] = col.ink[1]; gd[j + 2] = col.ink[2]; continue; }
        const dist = Math.min(1, edgeDist(gx, gy) / maxDistRef.current);
        const wave = Math.sin(fr * 0.11 - dist * 5.2 + noise[i] * 6.283);   // 결빛 파동 — 자리마다 다른 박자
        const sparkle = 0.36 + 0.28 * noise[i] + 0.36 * (0.5 + 0.5 * wave);
        const t = Math.min(1, dist * 1.15) * sparkle;
        gd[j] = col.halo[0] + (col.core[0] - col.halo[0]) * t;
        gd[j + 1] = col.halo[1] + (col.core[1] - col.halo[1]) * t;
        gd[j + 2] = col.halo[2] + (col.core[2] - col.halo[2]) * t;
      }
    }
    if (gctxRef.current) gctxRef.current.putImageData(gimg, 0, 0);
  }

  function compose(now: number): void {
    const ctx = ctxRef.current, img = imgRef.current, col = colRef.current;
    if (!ctx || !img || !col) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const d = img.data;
    // ① 유리창 배경 — 세로 그라디언트 + 숨쉬는 성에 안개
    const topR = col.ink[0] + 4, topG = col.ink[1] + 4, topB = col.ink[2] + 8;
    const botR = col.ink[0] + (col.dusk[0] - col.ink[0]) * 0.30, botG = col.ink[1] + (col.dusk[1] - col.ink[1]) * 0.30, botB = col.ink[2] + (col.dusk[2] - col.ink[2]) * 0.30;
    const breathe = 0.5 + 0.5 * Math.sin(frRef.current * 0.05);
    for (let y = 0; y < H; y++) {
      const ty = y / H;
      const br = topR + (botR - topR) * ty, bg = topG + (botG - topG) * ty, bb = topB + (botB - topB) * ty;
      const edgeY = Math.min(y, H - 1 - y) / (H * 0.5);
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const edgeX = Math.min(x, W - 1 - x) / (W * 0.5);
        const edge = 1 - Math.min(edgeX, edgeY);
        const vig = Math.pow(Math.max(0, edge), 2.2) * (0.10 + 0.05 * breathe);
        const j = (row + x) << 2;
        d[j] = br + (col.mist[0] - br) * vig;
        d[j + 1] = bg + (col.mist[1] - bg) * vig;
        d[j + 2] = bb + (col.mist[2] - bb) * vig;
      }
    }
    // ② 서리 결정 — 격자 이미지를 확대해 얹는다
    drawGrid();
    const gimg = gimgRef.current;
    if (gimg) {
      const sx = W / gw, sy = H / GH;
      for (let gy2 = 0; gy2 < GH; gy2++) {
        const gy0 = (gy2 * sy) | 0, gy1 = ((gy2 + 1) * sy) | 0;
        for (let gx2 = 0; gx2 < gw; gx2++) {
          const gi = (gy2 * gw + gx2) << 2;
          if (gimg.data[gi] === col.ink[0] && gimg.data[gi + 1] === col.ink[1] && gimg.data[gi + 2] === col.ink[2]) continue;
          const R = gimg.data[gi], G = gimg.data[gi + 1], B = gimg.data[gi + 2];
          const gx0 = (gx2 * sx) | 0, gx1 = ((gx2 + 1) * sx) | 0;
          for (let yy = gy0; yy < gy1 && yy < H; yy++) {
            const rowo = yy * W;
            for (let xx = gx0; xx < gx1 && xx < W; xx++) {
              const jj = (rowo + xx) << 2;
              d[jj] = R; d[jj + 1] = G; d[jj + 2] = B;
            }
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);

    // ③ 창을 닦고 지나가는 결빛 스윕 — 자란 뒤에도 화면이 계속 산다
    for (let sw = 0; sw < 2; sw++) {
      const ph = ((now * 0.0013) % 1 + 0.5 * sw) % 1;
      const cx = (ph * 1.7 - 0.35) * W, cy = (-0.15 + ph * 0.5) * H;
      const rr = W * 0.34, r2 = rr * rr;
      const x0 = Math.max(0, (cx - rr) | 0), x1 = Math.min(W - 1, (cx + rr) | 0);
      const y0 = Math.max(0, (cy - rr) | 0), y1 = Math.min(H - 1, (cy + rr) | 0);
      if (x1 < x0 || y1 < y0) continue;
      const pd = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
      const pdd = pd.data, pw = x1 - x0 + 1;
      for (let yy = y0; yy <= y1; yy++) {
        const dyy = yy - cy;
        for (let xx = x0; xx <= x1; xx++) {
          const dxx = xx - cx;
          const q = (dxx * dxx + dyy * dyy) / r2;
          if (q > 1) continue;
          const a = Math.pow(1 - q, 2) * 0.16;
          const pj = ((yy - y0) * pw + (xx - x0)) << 2;
          pdd[pj] += (col.core[0] - pdd[pj]) * a;
          pdd[pj + 1] += (col.core[1] - pdd[pj + 1]) * a;
          pdd[pj + 2] += (col.core[2] - pdd[pj + 2]) * a;
        }
      }
      ctx.putImageData(pd, x0, y0);
    }
  }

  const prevRef = useRef(0) as Box<number>;
  function frame(now: number): void {
    const dt = Math.min(50, now - (prevRef.current || now));
    prevRef.current = now;
    sim(dt);
    compose(now);
    frRef.current++;
    rafRef.current = requestAnimationFrame(frame);
  }
  function stillDraw(): void {
    fit();
    for (let i = 0; i < 30; i++) sim(33);
    compose(0);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    colRef.current = {
      ink: tokRGB(root, "--flake-ink"),
      dusk: tokRGB(root, "--flake-dusk"),
      core: tokRGB(root, "--flake-core"),
      halo: tokRGB(root, "--flake-halo"),
      mist: tokRGB(root, "--flake-mist"),
    };
    fit();
    function onResize(): void {
      fit();
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
  }, [gw, sps]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth={18} d="M20 20h216v216H20z"/><path fill="none" stroke="currentColor" strokeWidth={14} strokeLinecap="round" d="M40 40l60 60M216 40l-60 60M40 216l60-60M216 216l-60-60M128 20v70M128 166v70M20 128h70M166 128h70"/></svg>
          <span>씨앗을 창틀 가장자리 전체에 깔고 온도 필드를 안쪽으로 낮추면, 응집이 창가 서리처럼 가장자리에서 안쪽으로 프랙탈 무늬로 뻗어갑니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>격자 <b className={styles.val}>{gridShown}</b> · 응집 <b className={styles.val}>{spsShown}</b>/초</span>
          <span className={styles.metaDim}>캔버스 · ImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
