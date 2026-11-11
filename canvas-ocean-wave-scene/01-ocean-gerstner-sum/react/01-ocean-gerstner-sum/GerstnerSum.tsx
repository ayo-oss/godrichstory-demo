// GerstnerSum — vanilla 판(run/313/demo/01-ocean-gerstner-sum/index.html) 의 React 포트.
// 파장·방향·진폭이 다른 정현파 여섯을 수면 격자에 합성하고 Gerstner 수평 처짐까지 넣어
// 저해상 격자를 STEP=3 업스케일 버퍼로 펴 올린다. 바람은 자동 리사주 순환 + 포인터 실측.
// 움직임은 캔버스 rAF 루프가 전부이므로 @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./GerstnerSum.module.scss";

export type GerstnerSumProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerMotionEvent = { clientX: number; clientY: number };

const COLS = 110;   // 수면 격자 가로 칸 수
const STEP = 3;     // 격자 한 칸이 렌더 버퍼에서 차지하는 픽셀
const NW = 6;       // 겹칠 정현파 개수
const Q = 0.42;     // Gerstner 처짐 계수

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

// 여섯 정현파 구성 — 파장·방향·진폭·위상 전부 시드(7)에서 파생
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
    // ω ∝ sqrt(1/λ) — 파장 짧을수록 빠르게
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

export default function GerstnerSum({
  duration = "2s",                       // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)", // vanilla $easing: $ease-spring
  color = "#8fdac2",                     // vanilla $color: $gs-crest (근사값)
}: GerstnerSumProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const wavesRef = useRef<Wave[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  type St = {
    rows: number; rw: number; rh: number;
    hgt: Float32Array | null;
    disp: Float32Array | null;
    out: ImageData | null;
    bctx: CanvasRenderingContext2D | null;
    buf: HTMLCanvasElement | null;
    auto: boolean;
    wind: number; windT: number;
    windAng: number; windAngT: number;
    lastPX: number; lastPY: number; lastPT: number;
    c0: [number, number, number] | null;
    c1: [number, number, number] | null;
    t0: [number, number, number] | null;
    t1: [number, number, number] | null;
  };
  const stateRef = useRef({
    rows: 0, rw: 0, rh: 0,
    hgt: null as Float32Array | null,
    disp: null as Float32Array | null,
    out: null as ImageData | null,
    bctx: null as CanvasRenderingContext2D | null,
    buf: null as HTMLCanvasElement | null,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    lastPX: -1, lastPY: -1, lastPT: 0,
    c0: null as [number, number, number] | null,
    c1: null as [number, number, number] | null,
    t0: null as [number, number, number] | null,
    t1: null as [number, number, number] | null,
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
    const st = stateRef.current;
    st.rows = Math.max(40, Math.round(COLS * r.height / r.width));
    const n = COLS * st.rows;
    st.hgt = new Float32Array(n);
    st.disp = new Float32Array(n);
    st.rw = COLS * STEP;
    st.rh = st.rows * STEP;
    const buf = document.createElement("canvas");
    buf.width = st.rw; buf.height = st.rh;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(st.rw, st.rh);
  }

  // 파도장 높이 합성 + Gerstner 처짐
  function fieldcalc(t: number, wstr: number, wang: number): void {
    const st = stateRef.current;
    const WV = wavesRef.current;
    if (!st.hgt || !st.disp || !WV) return;
    let i = 0;
    for (let y = 0; y < st.rows; y++) {
      for (let x = 0; x < COLS; x++, i++) {
        let h = 0, d = 0;
        for (let k = 0; k < NW; k++) {
          const wv = WV[k];
          const da = wang * 0.5;
          const dx = wv.dirX * Math.cos(da) - wv.dirY * Math.sin(da);
          const dy = wv.dirX * Math.sin(da) + wv.dirY * Math.cos(da);
          const ph = (x * dx + y * dy) * wv.freq * 0.62 + t * wv.om + wv.ph;
          const a = wv.amp * wstr;
          h += a * Math.sin(ph);
          d += Q * a * Math.cos(ph) * dx;
        }
        st.hgt[i] = h;
        st.disp[i] = d;
      }
    }
  }

  function render(): void {
    const st = stateRef.current;
    const ctx = ctxRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.hgt || !st.disp) return;
    if (!st.c0 || !st.c1 || !st.t0 || !st.t1) return;
    const o = st.out.data;
    const C0 = st.c0, C1 = st.c1, T0 = st.t0, T1 = st.t1;
    for (let y = 0; y < st.rows; y++) {
      const row = y * COLS;
      for (let x = 0; x < COLS; x++) {
        const i = row + x;
        let u = st.hgt[i] * 1.24 + 0.5;
        if (u < 0) u = 0; else if (u > 1) u = 1;
        let r: number, g: number, b: number;
        if (u > 0.5) {
          const k = (u - 0.5) * 2;
          r = C1[0] + (C0[0] - C1[0]) * k;
          g = C1[1] + (C0[1] - C1[1]) * k;
          b = C1[2] + (C0[2] - C1[2]) * k;
        } else {
          const k2 = u * 2;
          r = T0[0] + (T1[0] - T0[0]) * k2;
          g = T0[1] + (T1[1] - T0[1]) * k2;
          b = T0[2] + (T1[2] - T0[2]) * k2;
        }
        const sp = st.disp[i] * 46;
        r += sp; g += sp; b += sp;
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
    const st = stateRef.current;
    const sec = now / 1000;
    if (st.auto) {
      const th = sec * 0.31;
      st.windT = 1.05 + Math.sin(th * 0.9 + 0.4) * 0.55 + Math.sin(th * 2.3) * 0.12;
      st.windAngT = 0.5 + Math.sin(th * 0.42) * 0.85;
    }
    st.wind += (st.windT - st.wind) * 0.05;
    st.windAng += (st.windAngT - st.windAng) * 0.05;
    fieldcalc(sec, st.wind, st.windAng);
    render();
    if (windValRef.current) windValRef.current.textContent = "바람 " + st.wind.toFixed(2);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPointerMove(e: PointerMotionEvent): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const t = performance.now();
    const st = stateRef.current;
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
    stateRef.current.auto = true;
    stateRef.current.lastPX = -1;
  }

  function onResize(): void {
    fit();
    if (reduced()) {
      fieldcalc(7.3, 1.35, 0.5);
      render();
    }
  }

  useEffect(() => {
    const cv = cvRef.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    wavesRef.current = buildWaves();
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    const st = stateRef.current;
    st.c0 = hex2rgb(tok("--crest"));
    st.c1 = hex2rgb(tok("--crest-2"));
    st.t0 = hex2rgb(tok("--trough"));
    st.t1 = hex2rgb(tok("--trough-2"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프 없이 시드가 정한 한 시각의 파도장을 담는다
      stillRef.current = true;
      fieldcalc(7.3, 1.35, 0.5);
      render();
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
          <span>정현파 여섯을 합성해 수면 격자를 계산합니다 — 그리면 바람이 파도를 밉니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum}>파 6</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
