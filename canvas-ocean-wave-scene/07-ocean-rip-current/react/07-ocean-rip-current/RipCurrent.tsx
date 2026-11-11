// RipCurrent — vanilla 판(run/313/demo/07-ocean-rip-current/index.html) 의 React 포트.
// 01(GerstnerSum)과 같은 뿌리(정현파 6개 mulberry32(7))의 파도장에 국소 와류(회전 유도체)를
// 한 겹 얹는다 — 셀 좌표를 와류 중심 기준 극좌표로 바꿔 위상에 각도·반경 감쇠를 더한다.
// 와류 중심은 자동 리사주로 배회하거나 포인터를 따라간다. 움직임은 rAF 루프가 전부.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RipCurrent.module.scss";

export type RipCurrentProps = {
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
const SWIRL = 2.6;
const VORTEX_R = 30;

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

export default function RipCurrent({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f4ead2",
}: RipCurrentProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const swirlValRef = useRef<HTMLSpanElement | null>(null);
  const windValRef = useRef<HTMLSpanElement | null>(null);
  const wavesRef = useRef<Wave[] | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  type St = {
    rows: number; rw: number; rh: number;
    hgt: Float32Array | null;
    foam: Float32Array | null;
    out: ImageData | null;
    bctx: CanvasRenderingContext2D | null;
    buf: HTMLCanvasElement | null;
    auto: boolean;
    wind: number; windT: number;
    windAng: number; windAngT: number;
    vx: number; vy: number; vxT: number; vyT: number;
    swirl: number; swirlT: number;
    lastPX: number; lastPY: number; lastPT: number;
    c0: [number, number, number] | null;
    c1: [number, number, number] | null;
    t0: [number, number, number] | null;
    t1: [number, number, number] | null;
    fc: [number, number, number] | null;
  };
  const stateRef = useRef({
    rows: 0, rw: 0, rh: 0,
    hgt: null as Float32Array | null,
    foam: null as Float32Array | null,
    out: null as ImageData | null,
    bctx: null as CanvasRenderingContext2D | null,
    buf: null as HTMLCanvasElement | null,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    vx: 0.5, vy: 0.42, vxT: 0.5, vyT: 0.42,
    swirl: 1.0, swirlT: 1.0,
    lastPX: -1, lastPY: -1, lastPT: 0,
    c0: null as [number, number, number] | null,
    c1: null as [number, number, number] | null,
    t0: null as [number, number, number] | null,
    t1: null as [number, number, number] | null,
    fc: null as [number, number, number] | null,
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
    st.foam = new Float32Array(n);
    st.rw = COLS * STEP;
    st.rh = st.rows * STEP;
    const buf = document.createElement("canvas");
    buf.width = st.rw; buf.height = st.rh;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(st.rw, st.rh);
  }

  function fieldcalc(t: number, wstr: number, wang: number, cx: number, cy: number, sw: number): void {
    const st = stateRef.current;
    const WV = wavesRef.current;
    if (!st.hgt || !st.foam || !WV) return;
    let i = 0;
    for (let y = 0; y < st.rows; y++) {
      for (let x = 0; x < COLS; x++, i++) {
        const dxv = x - cx, dyv = y - cy;
        const r = Math.sqrt(dxv * dxv + dyv * dyv);
        const ang = Math.atan2(dyv, dxv);
        let fall = r < VORTEX_R ? 1 - r / VORTEX_R : 0;
        fall *= fall;
        const twist = SWIRL * sw * fall * ang;
        let h = 0;
        for (let k = 0; k < NW; k++) {
          const wv = WV[k];
          const da = wang * 0.5;
          const dx = wv.dirX * Math.cos(da) - wv.dirY * Math.sin(da);
          const dy = wv.dirX * Math.sin(da) + wv.dirY * Math.cos(da);
          const ph = (x * dx + y * dy) * wv.freq * 0.62 + t * wv.om + wv.ph;
          h += wv.amp * wstr * Math.sin(ph + twist);
        }
        st.hgt[i] = h;
        let foamv = fall * 0.85 + Math.max(0, h) * 0.5;
        if (foamv > 1) foamv = 1;
        st.foam[i] = foamv;
      }
    }
  }

  function render(): void {
    const st = stateRef.current;
    const ctx = ctxRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.hgt || !st.foam) return;
    if (!st.c0 || !st.c1 || !st.t0 || !st.t1 || !st.fc) return;
    const o = st.out.data;
    const C0 = st.c0, C1 = st.c1, T0 = st.t0, T1 = st.t1, FC = st.fc;
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
        const f = st.foam[i];
        if (f > 0.02) {
          r = r + (FC[0] - r) * f * 0.8;
          g = g + (FC[1] - g) * f * 0.8;
          b = b + (FC[2] - b) * f * 0.8;
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
    const st = stateRef.current;
    const sec = now / 1000;
    if (st.auto) {
      const th = sec * 0.31;
      st.windT = 1.05 + Math.sin(th * 0.9 + 0.4) * 0.55 + Math.sin(th * 2.3) * 0.12;
      st.windAngT = 0.5 + Math.sin(th * 0.42) * 0.85;
      st.vxT = 0.5 + Math.sin(th * 0.37 + 1.2) * 0.3;
      st.vyT = 0.44 + Math.sin(th * 0.53 + 2.1) * 0.26;
      st.swirlT = 1.0 + Math.sin(th * 0.7) * 0.35;
    }
    st.wind += (st.windT - st.wind) * 0.05;
    st.windAng += (st.windAngT - st.windAng) * 0.05;
    st.vx += (st.vxT - st.vx) * 0.045;
    st.vy += (st.vyT - st.vy) * 0.045;
    st.swirl += (st.swirlT - st.swirl) * 0.04;
    fieldcalc(sec, st.wind, st.windAng, st.vx * COLS, st.vy * st.rows, st.swirl);
    render();
    if (swirlValRef.current) swirlValRef.current.textContent = "회전 " + st.swirl.toFixed(1);
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
    st.vxT = Math.max(0.04, Math.min(0.96, px / sizeRef.current.w));
    st.vyT = Math.max(0.04, Math.min(0.96, py / sizeRef.current.h));
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
      fieldcalc(7.3, 1.35, 0.5, 0.46 * COLS, 0.42 * st.rows, 1.2);
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
    st.fc = hex2rgb(tok("--foam"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillRef.current = true;
      fieldcalc(7.3, 1.35, 0.5, 0.46 * COLS, 0.42 * st.rows, 1.2);
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
          <span>파도장에 국소 회전을 한 겹 얹어 소용돌이를 만듭니다 — 마우스를 대면 회전 중심이 그리로 갑니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={swirlValRef}>회전 1.0</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
