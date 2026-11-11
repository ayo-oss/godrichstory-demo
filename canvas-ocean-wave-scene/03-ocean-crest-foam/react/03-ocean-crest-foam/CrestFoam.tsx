// CrestFoam — vanilla 판(run/313/demo/03-ocean-crest-foam/index.html) 의 React 포트.
// 01 과 같은 2D 파도장(정현파 6개, 시드 7)을 억제된 파랑 바탕 위에 그리고,
// 합성높이 > 실효진폭×문턱 인 칸만 smoothstep 가장자리로 크림 whitecap 을 얹는다.
// 문턱은 바람 세기에 반비례(0.82→0.55). 움직임은 캔버스 rAF 루프가 전부이므로 @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./CrestFoam.module.scss";

export type CrestFoamProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerMotionEvent = { clientX: number; clientY: number };
type RGB = [number, number, number];

const COLS = 110;      // 수면 격자 가로 칸 수
const STEP = 3;        // 격자 한 칸이 렌더 버퍼에서 차지하는 픽셀
const NW = 6;          // 겹칠 정현파 개수
const FOAM_EDGE = 0.16; // smoothstep 가장자리 폭(문턱 비율 단위)

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

function hex2rgb(s: string): RGB {
  // sass 가 mix() 값을 rgb(r%, g%, b%) 로 내보낸다 — 헥스와 둘 다 읽는다
  const pm = /^\s*rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)\s*$/.exec(s);
  if (pm) return [Math.round(+pm[1] * 2.55), Math.round(+pm[2] * 2.55), Math.round(+pm[3] * 2.55)];
  let t = s.replace("#", "");
  if (t.length === 3) t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  const n = parseInt(t, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function smoothstep(a: number, b: number, x: number): number {
  let t = (x - a) / (b - a);
  if (t < 0) t = 0; else if (t > 1) t = 1;
  return t * t * (3 - 2 * t);
}

// 문턱은 바람에 반비례 — 0.82(약한 바람) → 0.55(강한 바람)
function thresholdFor(w: number): number {
  return 0.82 - 0.27 * Math.max(0, Math.min(1, (w - 0.35) / (2.1 - 0.35)));
}

type St = {
  rows: number; rw: number; rh: number;
  hgt: Float32Array | null;
  out: ImageData | null;
  bctx: CanvasRenderingContext2D | null;
  buf: HTMLCanvasElement | null;
  ampSum: number;
  auto: boolean;
  wind: number; windT: number;
  windAng: number; windAngT: number;
  lastPX: number; lastPY: number; lastPT: number;
  rb0: RGB | null; rb1: RGB | null; rdeep: RGB | null;
  rf: RGB | null; rf2: RGB | null;
};

export default function CrestFoam({
  duration = "2s",                       // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#fff7e6",                     // vanilla $color: $cf-foam (근사값)
}: CrestFoamProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const thrValRef = useRef<HTMLSpanElement | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const wavesRef = useRef<Wave[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  const stRef = useRef({
    rows: 0, rw: 0, rh: 0,
    hgt: null,
    out: null,
    bctx: null,
    buf: null,
    ampSum: 0,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    lastPX: -1, lastPY: -1, lastPT: 0,
    rb0: null, rb1: null, rdeep: null, rf: null, rf2: null,
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
    st.rows = Math.max(40, Math.round(COLS * r.height / r.width));
    st.hgt = new Float32Array(COLS * st.rows);
    st.rw = COLS * STEP;
    st.rh = st.rows * STEP;
    const buf = document.createElement("canvas");
    buf.width = st.rw; buf.height = st.rh;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(st.rw, st.rh);
  }

  // 파도장 높이 합성 — height(x,y,t) = Σ amp·sin(dot(k·dir,(x,y)) + t·ω + φ)
  function fieldcalc(t: number, wstr: number, wang: number): void {
    const st = stRef.current;
    const WV = wavesRef.current;
    if (!st.hgt || !WV) return;
    let i = 0;
    for (let y = 0; y < st.rows; y++) {
      for (let x = 0; x < COLS; x++, i++) {
        let h = 0;
        for (let k = 0; k < NW; k++) {
          const wv = WV[k];
          const da = wang * 0.5;
          const dx = wv.dirX * Math.cos(da) - wv.dirY * Math.sin(da);
          const dy = wv.dirX * Math.sin(da) + wv.dirY * Math.cos(da);
          const ph = (x * dx + y * dy) * wv.freq * 0.62 + t * wv.om + wv.ph;
          h += wv.amp * wstr * Math.sin(ph);
        }
        st.hgt[i] = h;
      }
    }
  }

  // 렌더 — 억제된 바탕 램프 위에 문턱을 넘은 칸만 크림 whitecap(smoothstep 가장자리)
  function render(thr: number): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.hgt) return;
    if (!st.rb0 || !st.rb1 || !st.rdeep || !st.rf || !st.rf2) return;
    const o = st.out.data;
    const RB0 = st.rb0, RB1 = st.rb1, RDEEP = st.rdeep, RF = st.rf, RF2 = st.rf2;
    const eff = st.ampSum * st.wind;   // 실효 진폭 — 현재 바람까지 반영한 파도장 스케일
    const cut = eff * thr;
    for (let y = 0; y < st.rows; y++) {
      const row = y * COLS;
      for (let x = 0; x < COLS; x++) {
        const idx = row + x;
        const h = st.hgt[idx];
        let u = h * 0.55 * 1.24 + 0.5;
        if (u < 0) u = 0; else if (u > 1) u = 1;
        let r: number, g: number, b: number;
        if (u > 0.5) {
          const k = (u - 0.5) * 2;
          r = RB1[0] * (1 - k) + RB0[0] * k;
          g = RB1[1] * (1 - k) + RB0[1] * k;
          b = RB1[2] * (1 - k) + RB0[2] * k;
        } else {
          const k2 = u * 2;
          r = RDEEP[0] * (1 - k2) + RB0[0] * k2;
          g = RDEEP[1] * (1 - k2) + RB0[1] * k2;
          b = RDEEP[2] * (1 - k2) + RB0[2] * k2;
        }
        const f = smoothstep(cut - FOAM_EDGE * eff, cut + FOAM_EDGE * eff, h);
        if (f > 0) {
          const top = smoothstep(cut + FOAM_EDGE * eff * 2.2, cut + eff * 0.42, h);
          const fr = RF[0] * (1 - top) + RF2[0] * top;
          const fg = RF[1] * (1 - top) + RF2[1] * top;
          const fb = RF[2] * (1 - top) + RF2[2] * top;
          r = r * (1 - f) + fr * f;
          g = g * (1 - f) + fg * f;
          b = b * (1 - f) + fb * f;
        }
        for (let sy = 0; sy < STEP; sy++) {
          let base = ((y * STEP + sy) * st.rw + x * STEP) * 4;
          for (let sx = 0; sx < STEP; sx++, base += 4) {
            o[base] = r;
            o[base + 1] = g;
            o[base + 2] = b;
            o[base + 3] = 255;
          }
        }
      }
    }
    st.bctx.putImageData(st.out, 0, 0);
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
    fieldcalc(sec, st.wind, st.windAng);
    const thr = thresholdFor(st.wind);
    render(thr);
    if (thrValRef.current) thrValRef.current.textContent = "문턱 " + Math.round(thr * 100) + "%";
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
      fieldcalc(7.3, 1.35, 0.5);
      render(thresholdFor(1.35));
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
    st.rb0 = hex2rgb(tok("--base0"));
    st.rb1 = hex2rgb(tok("--base1"));
    st.rdeep = hex2rgb(tok("--deep"));
    st.rf = hex2rgb(tok("--foam"));
    st.rf2 = hex2rgb(tok("--foam2"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillRef.current = true;
      fieldcalc(7.3, 1.35, 0.5);
      render(thresholdFor(1.35));
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
          <span>합성 높이가 진폭의 문턱을 넘는 칸만 크림색으로 부서뜨립니다 — 바람이 세질수록 흰 꼭대기가 늘어요</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={thrValRef}>문턱 72%</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
