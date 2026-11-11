// CrystalLatticeColor — vanilla 판(run/319/demo/06-snowflake-crystal-lattice-color/index.html) 의 React 포트.
// DLA 는 입자가 붙는 "순간"을 기록한다 — order 배열에 셀 인덱스를 stick 순서대로 쌓고, 그려질 때
// 나이(순번 / 지금까지 총 응집)를 8단 파스텔 LUT 로 읽는다. 같은 시각에 붙은 셀은 같은 나이 →
// 결정 안에 나무 나이테 같은 동심원이 새겨진다. 격자(저해상도) 점유를 ImageData 한 장에 그려
// 확대해 붙이고, 성장이 다 차면 반짝 회전 후 리셋한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CrystalLatticeColor.module.scss";

export type CrystalLatticeColorProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;      // 격자 반경(셀 수) — 변형 "촘촘함" 축(46 커질수록 나이테가 촘촘해진다)
  sps?: number;    // 초당 응집 입자 수 — 변형 "응집 속도" 축(90 ↔ 700)
  rings?: number;  // 연륜 단수 — 나이를 몇 개의 파스텔 띠로 나눌지(6 ↔ 12)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Walker = { gx: number; gy: number };
type Colors = { ink: RGB; dusk: RGB; core: RGB; halo: RGB; mint: RGB; sky: RGB; mist: RGB };

const FIELD_LABEL = "결정 격자 채색 실험판";

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

export default function CrystalLatticeColor({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#a4bcd8",
  n = 46,
  sps = 300,
  rings = 8,
}: CrystalLatticeColorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const imgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const gimgRef = useRef<ImageData | null>(null) as Box<ImageData | null>;
  const gctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const randRef = useRef<() => number>(makePRNG(0x3190406)) as Box<() => number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [ringsShown] = useState(rings);
  const [spsShown] = useState(sps);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  // ── 결정 상태(ref 로 보관 — rAF 루프에서만 갱신, 리렌더 유발 안 함) ──
  const GW = 2 * n + 8, GH = GW;
  const CX = (GW / 2) | 0, CY = CX;
  const occRef = useRef<Uint8Array>(new Uint8Array(GW * GH)) as Box<Uint8Array>;
  const ageRef = useRef<Int32Array>(new Int32Array(GW * GH)) as Box<Int32Array>;   // 셀별 나이(stick 순서, 1부터 — 0=빈칸)
  const orderRef = useRef<number[]>([]) as Box<number[]>;   // stick 순서대로 셀 인덱스를 쌓는다(나이테의 역사)
  const walkersRef = useRef<Walker[]>([]) as Box<Walker[]>;
  const phaseRef = useRef(0) as Box<number>;
  const shineTRef = useRef(0) as Box<number>;
  const frRef = useRef(0) as Box<number>;
  const lutRef = useRef<{ r: Uint8ClampedArray; g: Uint8ClampedArray; b: Uint8ClampedArray } | null>(null);
  const WALKERS = 40;

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
    return gy * GW + gx;
  }

  function respawn(w: Walker): void {
    const rand = randRef.current;
    const a = rand() * 6.283, r = 6 + rand() * Math.min(10, n * 0.35);
    w.gx = CX + Math.round(Math.cos(a) * r);
    w.gy = CY + Math.round(Math.sin(a) * r);
    if (w.gx < 1 || w.gx >= GW - 1 || w.gy < 1 || w.gy >= GH - 1) { w.gx = CX + 2; w.gy = CY; }
  }

  const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  function stepWalker(w: Walker): boolean {
    const rand = randRef.current;
    const occ = occRef.current;
    const age = ageRef.current;
    const order = orderRef.current;
    const d = (rand() * 4) | 0;
    const nx = w.gx + DX[d], ny = w.gy + DY[d];
    const dx = nx - CX, dy = ny - CY;
    if (dx * dx + dy * dy > n * n) { respawn(w); return false; }   // 격자 밖 → 구름으로 되돌린다
    w.gx = nx; w.gy = ny;
    const i = idx(nx, ny);
    if (occ[i]) return false;
    const nc = (occ[idx(nx - 1, ny)] ? 1 : 0) + (occ[idx(nx + 1, ny)] ? 1 : 0) +
              (occ[idx(nx, ny - 1)] ? 1 : 0) + (occ[idx(nx, ny + 1)] ? 1 : 0);
    if (!nc) return false;
    // 가지 확률 — 이웃이 적게 닿은 외곽일수록 잘 붙는다(DLA 수지상 편향)
    const p = nc === 1 ? 1.0 : nc === 2 ? 0.62 : nc === 3 ? 0.22 : 0.10;
    if (rand() >= p) return false;
    occ[i] = 1;
    order.push(i);
    age[i] = order.length;                  // 나이 = 붙은 순번 — 색의 유일한 출처
    respawn(w);
    return true;
  }

  function resetSim(): void {
    const occ = occRef.current, age = ageRef.current;
    occ.fill(0); age.fill(0); orderRef.current = [];
    const order = orderRef.current;
    occ[idx(CX, CY)] = 1; order.push(idx(CX, CY)); age[idx(CX, CY)] = 1;
    phaseRef.current = 0; shineTRef.current = 0;
    const ws: Walker[] = [];
    for (let i = 0; i < WALKERS; i++) { const w = { gx: CX, gy: CY }; respawn(w); ws.push(w); }
    walkersRef.current = ws;
  }

  function sim(dt: number): void {
    if (phaseRef.current === 1) {
      shineTRef.current += dt;
      if (shineTRef.current > 1200) resetSim();        // 완성 결정을 충분히 보여 준 다음 다음 세대
      return;
    }
    const quota = sps * dt / 1000;
    let stuck = 0, steps = 0;
    const maxSteps = 500000;
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
    if (orderRef.current.length > sps * 14) { phaseRef.current = 1; shineTRef.current = 0; }   // 약 14초 치 결정이면 완성
  }

  // 나이 → 파스텔 램프 LUT(256단계) — 나이테 rings 개의 띠를 지나며 색이 바뀐다
  function buildLUT(): void {
    const col = colRef.current;
    if (!col) return;
    const lut = {
      r: new Uint8ClampedArray(256),
      g: new Uint8ClampedArray(256),
      b: new Uint8ClampedArray(256),
    };
    // 띠 경계마다 살짝 밝은 테(나이테 선) — 같은 나이끼리 묶여 동심원으로 보인다
    const cs: RGB[] = [col.dusk, col.dusk, col.halo, col.mint, col.mist, col.sky, col.mint, col.core];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const band = Math.min(cs.length - 1, 1 + Math.floor(t * (cs.length - 1)));
      const c0 = cs[band - 1], c1 = cs[band];
      const f = Math.min(1, t * (cs.length - 1) - (band - 1) * 2 + 1);   // 띠 안에서 부드럽게
      const ring = (t * (cs.length - 1)) % 1;
      const edge = ring < 0.16 ? 0.35 * (1 - ring / 0.16) : 0;           // 띠 시작 = 밝은 나이테 선
      const r0 = c0[0] + (c1[0] - c0[0]) * f, g0 = c0[1] + (c1[1] - c0[1]) * f, b0 = c0[2] + (c1[2] - c0[2]) * f;
      lut.r[i] = r0 + (col.core[0] - r0) * edge;
      lut.g[i] = g0 + (col.core[1] - g0) * edge;
      lut.b[i] = b0 + (col.core[2] - b0) * edge;
    }
    lutRef.current = lut;
  }

  // 격자 → 작은 캔버스 ImageData(나이 색) → 큰 캔버스에 확대
  function drawGrid(pulse: number): void {
    const gimg = gimgRef.current, col = colRef.current, lut = lutRef.current;
    if (!gimg || !col || !lut) return;
    const gd = gimg.data;
    const age = ageRef.current;
    const total = Math.max(2, orderRef.current.length);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const i = gy * GW + gx, j = i << 2;
        const a = age[i];
        if (!a) { gd[j] = col.ink[0]; gd[j + 1] = col.ink[1]; gd[j + 2] = col.ink[2]; continue; }
        const t = a / total;                       // 나이 비율(0=첫 씨앗 → 1=방금 붙은 가장자리)
        const li = Math.max(0, Math.min(255, (t * 255 * pulse) | 0));
        gd[j] = lut.r[li]; gd[j + 1] = lut.g[li]; gd[j + 2] = lut.b[li];
      }
    }
    if (gctxRef.current) gctxRef.current.putImageData(gimg, 0, 0);
  }

  function compose(now: number): void {
    const ctx = ctxRef.current, img = imgRef.current, col = colRef.current, gimg = gimgRef.current;
    if (!ctx || !img || !col || !gimg) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const d = img.data;
    // ① 무대 — 세로 그라디언트 + 중앙 성광(결정이 자라는 자리를 은은히 밝힌다)
    const topR = col.ink[0] + 3, topG = col.ink[1] + 3, topB = col.ink[2] + 6;
    const botR = col.ink[0] + (col.dusk[0] - col.ink[0]) * 0.34, botG = col.ink[1] + (col.dusk[1] - col.ink[1]) * 0.34, botB = col.ink[2] + (col.dusk[2] - col.ink[2]) * 0.34;
    const breathe = 0.5 + 0.5 * Math.sin(now * 0.0011);
    const gx0 = 0.5 + 0.06 * Math.sin(now * 0.0007), gy0 = 0.5 + 0.05 * Math.cos(now * 0.0009);
    for (let y = 0; y < H; y++) {
      const ty = y / H;
      const br = topR + (botR - topR) * ty, bg = topG + (botG - topG) * ty, bb = topB + (botB - topB) * ty;
      const row = y * W, dy = (y / H - gy0) * H;
      for (let x = 0; x < W; x++) {
        const dx = (x / W - gx0) * W * 1.35;
        const q = (dx * dx + dy * dy) / (H * H * 1.6);
        const glow = Math.exp(-q) * (0.10 + 0.05 * breathe);
        const j = (row + x) << 2;
        d[j] = br + (col.mist[0] - br) * glow;
        d[j + 1] = bg + (col.mist[1] - bg) * glow;
        d[j + 2] = bb + (col.mist[2] - bb) * glow;
      }
    }
    // ② 결정 나이테 — 나이 비율에 살짝 숨쉬는 맥(색 램프 인덱스를 조금씩 흔든다)
    const pulse = 0.94 + 0.06 * Math.sin(now * 0.0023);
    drawGrid(pulse);
    const sx = W / GW, sy = H / GH;
    const ox = ((W - GW * sx) / 2) | 0, oy = ((H - GH * sy) / 2) | 0;
    for (let gy2 = 0; gy2 < GH; gy2++) {
      const yA = oy + ((gy2 * sy) | 0), yB = oy + (((gy2 + 1) * sy) | 0);
      for (let gx2 = 0; gx2 < GW; gx2++) {
        const gi = (gy2 * GW + gx2) << 2;
        if (gimg.data[gi] === col.ink[0] && gimg.data[gi + 1] === col.ink[1] && gimg.data[gi + 2] === col.ink[2]) continue;
        const R = gimg.data[gi], G = gimg.data[gi + 1], B = gimg.data[gi + 2];
        const xA = ox + ((gx2 * sx) | 0), xB = ox + (((gx2 + 1) * sx) | 0);
        for (let yy = Math.max(0, yA); yy < Math.min(H, yB); yy++) {
          const rowo = yy * W;
          for (let xx = Math.max(0, xA); xx < Math.min(W, xB); xx++) {
            const jj = (rowo + xx) << 2;
            d[jj] = R; d[jj + 1] = G; d[jj + 2] = B;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    // ③ 떠다니는 눈가루 — 결정 위를 파스텔 가루가 느리게 흘러 화면이 쉬지 않는다
    for (let m = 0; m < 26; m++) {
      const ph = (m / 26 + now * 0.00006 * (1 + (m % 3) * 0.4)) % 1;
      const mx = (0.12 + 0.76 * ((m * 0.137 + now * 0.00004 * (1 + (m % 5) * 0.3)) % 1)) * W;
      const my = ph * H;
      const mr = 1 + (m % 3), ma = 0.24 + 0.16 * Math.sin(now * 0.003 + m);
      ctx.fillStyle = `rgba(${col.mist[0]},${col.mist[1]},${col.mist[2]},${ma.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, 6.283);
      ctx.fill();
    }
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
    gcanvas.width = GW; gcanvas.height = GH;
    const gctx = gcanvas.getContext("2d");
    if (!gctx) return;
    gctxRef.current = gctx;
    const gimg = gctx.createImageData(GW, GH);
    for (let j = 3; j < gimg.data.length; j += 4) gimg.data[j] = 255;
    gimgRef.current = gimg;
    randRef.current = makePRNG(0x3190406);
    resetSim();
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
    for (let i = 0; i < 400; i++) sim(33);
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
      mint: tokRGB(root, "--flake-mint"),
      sky: tokRGB(root, "--flake-sky"),
      mist: tokRGB(root, "--flake-mist"),
    };
    buildLUT();
    fit();
    function onResize(): void {
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
  }, [n, sps, rings]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><circle cx={128} cy={128} r={16} fill="none" stroke="currentColor" strokeWidth={16}/><circle cx={128} cy={128} r={48} fill="none" stroke="currentColor" strokeWidth={12} opacity={.75}/><circle cx={128} cy={128} r={80} fill="none" stroke="currentColor" strokeWidth={10} opacity={.5}/><circle cx={128} cy={128} r={108} fill="none" stroke="currentColor" strokeWidth={8} opacity={.3}/></svg>
          <span>입자가 붙은 순간을 번호로 기록해 나이별로 색을 달리하면, 결정의 성장 연륜이 나무 나이테처럼 파스텔 동심원으로 읽힙니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>연륜 <b className={styles.val}>{ringsShown}</b> · 응집 <b className={styles.val}>{spsShown}</b>/초</span>
          <span className={styles.metaDim}>캔버스 · ImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
