// DepthAttenuate — vanilla 판(run/313/demo/02-ocean-depth-attenuate/index.html) 의 React 포트.
// 1D 수면 곡선(정현파 6개, 시드 7)을 시간 팬으로 읽고 그 아래 픽셀마다 수심 d 에
// exp(-감쇠계수·d) 를 적용해 민트(얕음)→진한 파랑(깊음) 4단 램프로 섞는다. 바닥은 크림 모래.
// 바람은 자동 리사주 순환 + 포인터 실측. 움직임은 캔버스 rAF 루프가 전부이므로 @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DepthAttenuate.module.scss";

export type DepthAttenuateProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerMotionEvent = { clientX: number; clientY: number };

const COLS = 160;    // 1D 수면 곡선 표본 수 — 가로 해상도
const STEP = 3;      // 격자 한 칸이 렌더 버퍼에서 차지하는 픽셀 → RW = 480
const NW = 6;        // 겹칠 정현파 개수
const RW = 480;
const RH = 160;
const SAND_PX = 20;  // 바닥 모래 두께(버퍼 기준 px)

// 결정적 난수 mulberry32(7)
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

type Wave = {
  lam: number; freq: number; dirX: number; dirY: number;
  amp: number; spd: number; ph: number; om: number;
};

function buildWaves(): Wave[] {
  const rng = mulberry32(7);
  const out: Wave[] = [];
  let lam = 34;
  for (let i = 0; i < NW; i++) {
    const ang = rng() * Math.PI * 2;
    const wv: Wave = {
      lam,
      freq: (Math.PI * 2) / lam,
      dirX: Math.cos(ang),
      dirY: Math.sin(ang),
      amp: 0.58 / (i * 0.62 + 1),
      spd: 0.55 + rng() * 0.25,
      ph: rng() * Math.PI * 2,
      om: 0,
    };
    wv.om = wv.spd * 3.6 * Math.sqrt(1 / wv.lam) * 6;
    out.push(wv);
    lam *= 0.55;
  }
  return out;
}

function hex2rgb(s: string): [number, number, number] {
  // sass 가 mix() 값을 rgb(r%, g%, b%) 로 내보낸다 — 헥스와 둘 다 읽는다
  const pm = /^\s*rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)\s*$/.exec(s);
  if (pm) return [Math.round(+pm[1] * 2.55), Math.round(+pm[2] * 2.55), Math.round(+pm[3] * 2.55)];
  let t = s.replace("#", "");
  if (t.length === 3) t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  const n = parseInt(t, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function DepthAttenuate({
  duration = "2s",                       // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#8fdac2",                     // vanilla $color: $da-c0 (근사값)
}: DepthAttenuateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const attenValRef = useRef<HTMLSpanElement | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const wavesRef = useRef<Wave[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  const surfRef = useRef(new Float32Array(COLS)) as Box<Float32Array>;
  type St = {
    buf: HTMLCanvasElement | null;
    bctx: CanvasRenderingContext2D | null;
    out: ImageData | null;
    ampSum: number;
    auto: boolean;
    wind: number; windT: number;
    windAng: number; windAngT: number;
    lastPX: number; lastPY: number; lastPT: number;
    c0: [number, number, number] | null;
    c1: [number, number, number] | null;
    t0: [number, number, number] | null;
    t1: [number, number, number] | null;
    sand: [number, number, number] | null;
  };
  const stRef = useRef({
    buf: null,
    bctx: null,
    out: null,
    ampSum: 0,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    lastPX: -1, lastPY: -1, lastPT: 0,
    c0: null, c1: null, t0: null, t1: null, sand: null,
  } as St) as Box<St>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    const st = stRef.current;
    const buf = document.createElement("canvas");
    buf.width = RW; buf.height = RH;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(RW, RH);
  }

  // 1D 수면 곡선 — height(x,t) = Σ amp·sin(x·dirX·freq·0.62 + t·ω + φ)
  function surfcalc(t: number, wstr: number, wang: number): void {
    const WV = wavesRef.current;
    const surf = surfRef.current;
    if (!WV) return;
    for (let x = 0; x < COLS; x++) {
      let h = 0;
      for (let k = 0; k < NW; k++) {
        const wv = WV[k];
        const da = wang * 0.5;
        const dx = wv.dirX * Math.cos(da) - wv.dirY * Math.sin(da);
        const ph = (x * dx) * wv.freq * 0.62 + t * wv.om + wv.ph;
        h += wv.amp * wstr * Math.sin(ph);
      }
      surf[x] = h;
    }
  }

  // 렌더 — 수면선 위는 투명, 아래는 수심 지수 감쇠 4단 램프, 바닥 20px 모래
  function render(attenK: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    const surf = surfRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.c0 || !st.c1 || !st.t0 || !st.t1 || !st.sand) return;
    const o = st.out.data;
    const RC0 = st.c0, RC1 = st.c1, RT0 = st.t0, RT1 = st.t1, RSAND = st.sand;
    const baseline = RH * 0.4;
    const ampPx = RH * 0.34;
    for (let cx = 0; cx < COLS; cx++) {
      let surfaceY = baseline + surf[cx] * ampPx;
      if (surfaceY < 0) surfaceY = 0; else if (surfaceY > RH - 2) surfaceY = RH - 2;
      for (let sx = 0; sx < STEP; sx++) {
        const px = cx * STEP + sx;
        for (let y = 0; y < RH; y++) {
          const base = (y * RW + px) * 4;
          if (y < surfaceY) {
            o[base] = 0; o[base + 1] = 0; o[base + 2] = 0; o[base + 3] = 0;
            continue;
          }
          if (y >= RH - SAND_PX) {
            o[base] = RSAND[0]; o[base + 1] = RSAND[1]; o[base + 2] = RSAND[2]; o[base + 3] = 255;
            continue;
          }
          const d = y - surfaceY;
          let u = 1 - Math.exp(-attenK * d);
          if (u < 0) u = 0; else if (u > 1) u = 1;
          let r: number, g: number, b: number;
          if (u < 1 / 3) {
            const k = u * 3;
            r = RC0[0] + (RC1[0] - RC0[0]) * k; g = RC0[1] + (RC1[1] - RC0[1]) * k; b = RC0[2] + (RC1[2] - RC0[2]) * k;
          } else if (u < 2 / 3) {
            const k2 = (u - 1 / 3) * 3;
            r = RC1[0] + (RT1[0] - RC1[0]) * k2; g = RC1[1] + (RT1[1] - RC1[1]) * k2; b = RC1[2] + (RT1[2] - RC1[2]) * k2;
          } else {
            const k3 = (u - 2 / 3) * 3;
            r = RT1[0] + (RT0[0] - RT1[0]) * k3; g = RT1[1] + (RT0[1] - RT1[1]) * k3; b = RT1[2] + (RT0[2] - RT1[2]) * k3;
          }
          o[base] = r; o[base + 1] = g; o[base + 2] = b; o[base + 3] = 255;
        }
      }
    }
    st.bctx.putImageData(st.out, 0, 0);
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h);
    ctx.drawImage(st.buf, 0, 0, sizeRef.current.w, sizeRef.current.h);
  }

  function frame(now: number): void {
    const st = stRef.current;
    const sec = now / 1000;
    if (st.auto) {
      const th = sec * 0.31;
      st.windT = 1.05 + Math.sin(th * 0.9 + 0.4) * 0.55 + Math.sin(th * 2.3) * 0.12;
      st.windAngT = 0.5 + Math.sin(th * 0.42) * 0.85;
    }
    st.wind += (st.windT - st.wind) * 0.05;
    st.windAng += (st.windAngT - st.windAng) * 0.05;
    surfcalc(sec, st.wind, st.windAng);
    const attenK = 0.045 + (st.wind / (st.ampSum * 3)) * 0.03;
    render(attenK);
    if (attenValRef.current) attenValRef.current.textContent = "수심 x" + attenK.toFixed(3);
    if (windValRef.current) windValRef.current.textContent = "바람 " + st.wind.toFixed(2);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPointerMove(e: PointerMotionEvent): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const t = performance.now();
    const st = stRef.current;
    if (st.lastPX >= 0 && t > st.lastPT) {
      const vx = px - st.lastPX, vy = py - st.lastPY;
      const sp = Math.sqrt(vx * vx + vy * vy);
      if (sp > 0.5) {
        st.windT = Math.max(0.35, Math.min(2.1, 0.9 + sp * 0.02));
        st.windAngT = Math.atan2(vy, vx) * 0.16;
      }
    }
    st.lastPX = px; st.lastPY = py; st.lastPT = t;
    st.auto = false;
  }

  function onPointerLeave(): void {
    stRef.current.auto = true;
    stRef.current.lastPX = -1;
  }

  function onResize(): void {
    fit();
    if (reduced()) {
      surfcalc(7.3, 1.35, 0.5);
      render(0.06);
    }
  }

  useEffect(() => {
    const cv = cvRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    wavesRef.current = buildWaves();
    let sum = 0;
    for (let i = 0; i < NW; i++) sum += wavesRef.current[i].amp;
    stRef.current.ampSum = sum;
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    const st = stRef.current;
    st.c0 = hex2rgb(tok("--c0"));
    st.c1 = hex2rgb(tok("--c1"));
    st.t0 = hex2rgb(tok("--t0"));
    st.t1 = hex2rgb(tok("--t1"));
    st.sand = hex2rgb(tok("--sand"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillRef.current = true;
      surfcalc(7.3, 1.35, 0.5);
      render(0.06);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const cls = [styles.root, stillRef.current ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M16 120c24-32 48-32 72 0s48 32 72 0 48-32 72 0" opacity=".25"/><path d="M16 168c24-32 48-32 72 0s48 32 72 0 48-32 72 0" opacity=".15"/><path d="M228.92 49.09a112 112 0 1 0 14 84.91a8 8 0 0 0-15.5-4a96 96 0 1 1-12-72.91A8 8 0 0 1 216 71.63V40a8 8 0 0 1-8-8h-31.63a8 8 0 0 1-5.65-13.09ZM64 104a12 12 0 1 1 12 12a12 12 0 0 1-12-12m40 64a12 12 0 1 1 12 12a12 12 0 0 1-12-12m72-16a16 16 0 1 1 16 16a16 16 0 0 1-16-16" opacity=".9"/></g></svg>
          <span>수면 아래 픽셀마다 수심을 지수로 감쇠시켜 얕은 바다 단면을 계산합니다 — 마우스로 물빛을 흔드세요</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={attenValRef}>수심 x0.060</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
