// RefractCaustic — vanilla 판(run/313/demo/06-ocean-refract-caustic/index.html) 의 React 포트.
// 01 과 같은 뿌리(정현파 6개, 시드 7)의 2D 파도장에서 픽셀마다 중앙차분 기울기를 구해
// 바닥 체커 무늬의 샘플 좌표를 그만큼 오프셋하는 굴절 근사 + 기울기 발산(2차 차분)의
// 절대값을 코스틱 밝기로 얹는다. 움직임은 캔버스 rAF 루프가 전부이므로 @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./RefractCaustic.module.scss";

export type RefractCausticProps = {
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
const REFRACT = 34;
const TILE_PX = 11;

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

export default function RefractCaustic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: RefractCausticProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const depthValRef = useRef<HTMLSpanElement | null>(null);
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
    lastPX: number; lastPY: number; lastPT: number;
    tile0: [number, number, number] | null;
    tile1: [number, number, number] | null;
    line: [number, number, number] | null;
    caustic: [number, number, number] | null;
  };
  const stRef = useRef({
    rows: 0, rw: 0, rh: 0,
    hgt: null, out: null, bctx: null, buf: null,
    auto: true,
    wind: 1.0, windT: 1.0,
    windAng: 0.5, windAngT: 0.5,
    lastPX: -1, lastPY: -1, lastPT: 0,
    tile0: null, tile1: null, line: null, caustic: null,
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
    st.rw = COLS * STEP; st.rh = st.rows * STEP;
    const buf = document.createElement("canvas");
    buf.width = st.rw; buf.height = st.rh;
    st.buf = buf;
    st.bctx = buf.getContext("2d");
    if (st.bctx) st.out = st.bctx.createImageData(st.rw, st.rh);
  }

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

  // 바닥 무늬 색 — 체커 + 옅은 격자선. 굴절 오프셋된 좌표(버퍼 px)에서 호출한다. 감싸기로 무한 바닥처럼.
  function tileColor(bx: number, by: number, rw: number, rh: number, tile0: [number, number, number], tile1: [number, number, number], line: [number, number, number]): [number, number, number] {
    const wx = ((bx % rw) + rw) % rw;
    const wy = ((by % rh) + rh) % rh;
    const cx = Math.floor(wx / TILE_PX), cy = Math.floor(wy / TILE_PX);
    const checker = (cx + cy) % 2 === 0;
    const lx = wx - cx * TILE_PX, ly = wy - cy * TILE_PX;
    if (lx < 1.4 || ly < 1.4) return line;
    return checker ? tile0 : tile1;
  }

  function render(): void {
    const st = stRef.current;
    const ctx = ctxRef.current;
    if (!st.out || !st.bctx || !st.buf || !ctx || !st.hgt) return;
    if (!st.tile0 || !st.tile1 || !st.line || !st.caustic) return;
    const o = st.out.data;
    const RT0 = st.tile0, RT1 = st.tile1, RL = st.line, RC = st.caustic;
    for (let y = 0; y < st.rows; y++) {
      const row = y * COLS;
      const y0 = y > 0 ? y - 1 : y, y1 = y < st.rows - 1 ? y + 1 : y;
      for (let x = 0; x < COLS; x++) {
        const x0 = x > 0 ? x - 1 : x, x1 = x < COLS - 1 ? x + 1 : x;
        const gx = (st.hgt[row + x1] - st.hgt[row + x0]) / Math.max(1, x1 - x0);
        const gy = (st.hgt[y1 * COLS + x] - st.hgt[y0 * COLS + x]) / Math.max(1, y1 - y0);
        const gxr = x1 < COLS - 1 ? (st.hgt[row + Math.min(COLS - 1, x1 + 1)] - st.hgt[row + x1]) : gx;
        const gyd = y1 < st.rows - 1 ? (st.hgt[Math.min(st.rows - 1, y1 + 1) * COLS + x] - st.hgt[y1 * COLS + x]) : gy;
        let div = Math.abs((gxr - gx) + (gyd - gy)) * 90;
        if (div > 1) div = 1;
        const offx = gx * REFRACT, offy = gy * REFRACT;
        const bx0 = x * STEP + STEP / 2, by0 = y * STEP + STEP / 2;
        const c = tileColor(bx0 + offx, by0 + offy, st.rw, st.rh, RT0, RT1, RL);
        let r = c[0], g = c[1], b = c[2];
        if (div > 0.06) {
          const f = (div - 0.06) / 0.94;
          r = r + (RC[0] - r) * f * 0.85;
          g = g + (RC[1] - g) * f * 0.85;
          b = b + (RC[2] - b) * f * 0.85;
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
    const st = stRef.current;
    st.tile0 = hex2rgb(tok("--tile0"));
    st.tile1 = hex2rgb(tok("--tile1"));
    st.line = hex2rgb(tok("--line"));
    st.caustic = hex2rgb(tok("--caustic"));
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
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
          <span>바닥 체커 무늬를 수면 기울기만큼 당겨 와 굴절을 근사합니다 — 밝은 코스틱은 기울기 발산으로 계산해요</span>
        </p>
        <div className={styles.field} ref={fieldRef} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <b className={styles.badge} aria-hidden="true"><span className={styles.badgeNum} ref={depthValRef}>굴절 x{REFRACT}</span><span className={styles.badgeUnit} ref={windValRef}>바람 1.0</span></b>
        </div>
      </div>
    </main>
  );
}
