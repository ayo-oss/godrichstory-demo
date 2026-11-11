// HorizonHaze — vanilla 판(run/313/demo/09-ocean-horizon-haze/index.html) 의 React 포트.
// 01(GerstnerSum)과 같은 뿌리(정현파 6개 mulberry32(7))의 파도장에 원근 압축(수평선에
// 가까울수록 잦은 주파수·낮은 진폭)과 거리 기반 안개 블렌드(공기원근)를 얹는다.
// 수평선 위는 하늘 그라디언트, 수평선 위치는 포인터 세로 좌표로 조절한다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./HorizonHaze.module.scss";

export type HorizonHazeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerMotionEvent = { clientX: number; clientY: number };

const COLS = 110;
const STEP = 3;
const NW = 6;

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
  const pm = /^\s*rgb\(\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)\s*$/.exec(s);
  if (pm) return [Math.round(+pm[1] * 2.55), Math.round(+pm[2] * 2.55), Math.round(+pm[3] * 2.55)];
  let t = s.replace("#", "");
  if (t.length === 3) t = t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  const n = parseInt(t, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function HorizonHaze({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#bcd9f2",
}: HorizonHazeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const horizonValRef = useRef<HTMLSpanElement | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const wavesRef = useRef<Wave[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  type St = {
    rows: number; rw: number; rh: number;
    hgt: Float32Array | null;
    out: ImageData | null;
    bctx: CanvasRenderingContext2D | null;
    buf: HTMLCanvasElement | null;
    auto: boolean;
    wind: number; windT: number;
    windAng: number; windAngT: number;
    horizon: number; horizonT: number;
    lastPX: number; lastPY: number; lastPT: number;
    c0: [number, number, number] | null;
    c1: [number, number, number] | null;
    t0: [number, number, number] | null;
    t1: [number, number, number] | null;
    sk0: [number, number, number] | null;
    sk1: [number, number, number] | null;
  };
  const stateRef = useRef({
    rows: 0, rw: 0, rh: 0,
    hgt: null as Float32Array | null,
    out: null as ImageData | null,
    bctx: null as CanvasRenderingContext2D | null,
    buf: null as HTMLCanvasElement | null,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    horizon: 0.34, horizonT: 0.34,
    lastPX: -1, lastPY: -1, lastPT: 0,
    c0: null as [number, number, number] | null,
    c1: null as [number, number, number] | null,
    t0: null as [number, number, number] | null,
    t1: null as [number, number, number] | null,
    sk0: null as [number, number, number] | null,
    sk1: null as [number, number, number] | null,
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
    st.rw = COLS * STEP;
    st.rh = st.rows * STEP;
    const buf = document.createElement("canvas");
    buf.width = st.rw; buf.height = st.rh;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(st.rw, st.rh);
  }

  function fieldcalc(t: number, wstr: number, wang: number, horizonRow: number): void {
    const st = stateRef.current;
    const WV = wavesRef.current;
    if (!st.hgt || !WV) return;
    let i = 0;
    for (let y = 0; y < st.rows; y++) {
      if (y < horizonRow) { i += COLS; continue; }
      let dist = st.rows > horizonRow ? (y - horizonRow) / (st.rows - horizonRow) : 1;
      if (dist > 1) dist = 1; else if (dist < 0) dist = 0;
      const freqMul = 1 + (1 - dist) * 2.4;
      const ampMul = 0.15 + dist * 0.85;
      for (let x = 0; x < COLS; x++, i++) {
        let h = 0;
        for (let k = 0; k < NW; k++) {
          const wv = WV[k];
          const da = wang * 0.5;
          const dx = wv.dirX * Math.cos(da) - wv.dirY * Math.sin(da);
          const dy = wv.dirX * Math.sin(da) + wv.dirY * Math.cos(da);
          const ph = (x * dx + y * dy) * wv.freq * 0.62 * freqMul + t * wv.om + wv.ph;
          h += wv.amp * wstr * ampMul * Math.sin(ph);
        }
        st.hgt[i] = h;
      }
    }
  }

  function render(horizonRow: number): void {
    const st = stateRef.current;
    const ctx = ctxRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.hgt) return;
    if (!st.c0 || !st.c1 || !st.t0 || !st.t1 || !st.sk0 || !st.sk1) return;
    const o = st.out.data;
    const C0 = st.c0, C1 = st.c1, T0 = st.t0, T1 = st.t1, SK0 = st.sk0, SK1 = st.sk1;
    for (let y = 0; y < st.rows; y++) {
      const row = y * COLS;
      if (y < horizonRow) {
        const sk = horizonRow > 0 ? y / horizonRow : 0;
        const sr = SK0[0] + (SK1[0] - SK0[0]) * sk;
        const sg = SK0[1] + (SK1[1] - SK0[1]) * sk;
        const sb = SK0[2] + (SK1[2] - SK0[2]) * sk;
        for (let x2 = 0; x2 < COLS; x2++) {
          for (let sy2 = 0; sy2 < STEP; sy2++) {
            let base2 = ((y * STEP + sy2) * st.rw + x2 * STEP) * 4;
            for (let sx2 = 0; sx2 < STEP; sx2++, base2 += 4) {
              o[base2] = sr; o[base2 + 1] = sg; o[base2 + 2] = sb; o[base2 + 3] = 255;
            }
          }
        }
        continue;
      }
      let dist = st.rows > horizonRow ? (y - horizonRow) / (st.rows - horizonRow) : 1;
      if (dist > 1) dist = 1; else if (dist < 0) dist = 0;
      const fog = Math.pow(1 - dist, 1.6);
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
        r += (SK1[0] - r) * fog;
        g += (SK1[1] - g) * fog;
        b += (SK1[2] - b) * fog;
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
      st.horizonT = 0.34 + Math.sin(th * 0.22) * 0.14;
    }
    st.wind += (st.windT - st.wind) * 0.05;
    st.windAng += (st.windAngT - st.windAng) * 0.05;
    st.horizon += (st.horizonT - st.horizon) * 0.05;
    const hr = Math.round(st.horizon * st.rows);
    fieldcalc(sec, st.wind, st.windAng, hr);
    render(hr);
    if (horizonValRef.current) horizonValRef.current.textContent = "수평선 " + Math.round(st.horizon * 100) + "%";
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
    st.horizonT = Math.max(0.06, Math.min(0.68, py / sizeRef.current.h));
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
      const st = stateRef.current;
      const hr = Math.round(0.34 * st.rows);
      fieldcalc(7.3, 1.35, 0.5, hr);
      render(hr);
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
    st.sk0 = hex2rgb(tok("--sky"));
    st.sk1 = hex2rgb(tok("--sky-2"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillRef.current = true;
      const hr = Math.round(0.34 * st.rows);
      fieldcalc(7.3, 1.35, 0.5, hr);
      render(hr);
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
          <span>수평선에서 멀수록 물색을 하늘빛과 섞고 파도 진폭도 눌러 공기원근을 만듭니다 — 마우스로 수평선을 위아래로 옮기세요</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={horizonValRef}>수평선 34%</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
