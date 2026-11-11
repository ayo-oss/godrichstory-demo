// BonfireCurl — vanilla 판(run/314/demo/02-fire-bonfire-curl/index.html) 의 React 포트.
// 불기둥 여러 개가 각자 장작 위에서 솟지만, 바람은 하나의 포텐셜 필드(ψ)에서 나온다.
// 컬(curl) = (∂ψ/∂y, −∂ψ/∂x) — 발산이 0 이라 입자가 쥐어짜이지 않고 회전만 하며
// 여러 불기둥이 서로의 소용돌이에 말려 한 덩어리로 넘실댄다. 미리보기는 시드 고정 Lissajous.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BonfireCurl.module.scss";

export type BonfireCurlProps = {
  duration?: string;
  easing?: string;
  color?: string;
  buoy?: number;      // 부력 계수 — 변형 "부력" 축(0.35 → 0.7)
  columns?: number;   // 불기둥(장작) 수
  tone?: 0 | 1;       // 코어 색 변형 — 0: amber, 1: rose
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Frag = { col: number; x: number; y: number; vx: number; vy: number; k: number; ph: number };
type Colors = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };
type Field = { kx: number[]; ky: number[]; w: number[]; ph: number[]; amp: number[] };

const TAU = Math.PI * 2;
const FIELD_LABEL = "모닥불 컬 노이즈 실험판";
const STILL_T = 1.7;    // reduce 에서 그리는 시각
const K_BURN = 2.0;     // 연료 소모율 (1/s)
const N_EACH = 150;     // 불기둥 하나당 입자 수
const NW = 6;           // 컬 노이즈 파수 개수

// 시드 고정 PRNG — mulberry32
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

function buildField(rand: () => number): Field {
  const kx: number[] = [], ky: number[] = [], w: number[] = [], ph: number[] = [], amp: number[] = [];
  for (let i = 0; i < NW; i++) {
    const ang = rand() * TAU;
    const len = 0.9 + rand() * 2.3;
    kx.push(Math.cos(ang) * len);
    ky.push(Math.sin(ang) * len);
    w.push(0.4 + rand() * 1.1);
    ph.push(rand() * TAU);
    amp.push(26 + rand() * 34);
  }
  return { kx, ky, w, ph, amp };
}

// 포텐셜 필드 ψ 의 컬 — 다이버전스프리 접선 바람 (px/s)
function curl(field: Field, x: number, y: number, t: number): [number, number] {
  let u = 0, v = 0;
  const fx = x / 180, fy = y / 180;
  for (let i = 0; i < NW; i++) {
    const c = Math.cos(field.kx[i] * fx + field.ky[i] * fy + field.w[i] * t + field.ph[i]);
    u += field.amp[i] * field.ky[i] * c;
    v -= field.amp[i] * field.kx[i] * c;
  }
  return [u, v];
}

export default function BonfireCurl({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0a868",
  buoy = 0.35,
  columns = 3,
  tone = 0,
}: BonfireCurlProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const buoyRef = useRef(buoy) as Box<number>;
  const nColRef = useRef(columns) as Box<number>;
  const toneRef = useRef(tone) as Box<number>;
  const noiseRef = useRef<Field | null>(null);
  const partsRef = useRef<Frag[]>([]) as Box<Frag[]>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [b, setB] = useState(buoy.toFixed(2));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 색은 CSS 커스텀 프로퍼티(--fire-*)에서 getComputedStyle 로 읽는다 — 파스텔 토큰이 scss 한 곳에
  function tokRGB(root: HTMLDivElement, name: string): RGB {
    const s = getComputedStyle(root).getPropertyValue(name).trim();
    const hx = s.length === 4
      ? s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3)
      : s.slice(1);
    return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
  }

  function coreRGB(col: Colors): RGB {
    return toneRef.current ? col.rose : col.amber;
  }

  function logX(ci: number, cx: number, W: number): number {
    const nCol = nColRef.current;
    const spread = Math.min(W * 0.3, 92);
    const slot = nCol === 1 ? 0 : ci / (nCol - 1) - 0.5;
    return cx + slot * spread;
  }

  function buildParts(): void {
    const rand = makePRNG(0x5eed02);
    noiseRef.current = buildField(rand);
    const nCol = nColRef.current;
    const total = N_EACH * nCol;
    const arr: Frag[] = [];
    for (let i = 0; i < total; i++) {
      const f: Frag = {
        col: (rand() * nCol) | 0,
        x: 0,
        y: -rand() * 60,
        vx: (rand() - 0.5) * 9,
        vy: -24 - rand() * 30,
        k: rand(),
        ph: rand() * TAU,
      };
      arr.push(f);
    }
    partsRef.current = arr;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    ctxRef.current = ctx;
    setB(buoyRef.current.toFixed(2));
  }

  function spawn(f: Frag, rand: () => number): void {
    f.col = (rand() * nColRef.current) | 0;
    f.x = 0;
    f.y = 0;
    f.vx = (rand() - 0.5) * 9;
    f.vy = -24 - rand() * 30;
    f.k = 1;
    f.ph = rand() * TAU;
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const parts = partsRef.current;
    const field = noiseRef.current;
    if (!ctx || !col || !field || parts.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    const rand = makePRNG(0x5eed02 + ((tSec * 61) | 0));
    const core = coreRGB(col);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const ground = H * 0.84;
    const power = 0.6 + pyRef.current * 0.8;

    let flick = 0;
    for (let f = 0; f < parts.length; f++) flick += parts[f].k;
    flick = (flick / parts.length) * power;
    // 앙비언트 글로우 — 반경이 breathe 로 진동하고 알파는 flick·sin 펄스로 매 프레임 재계산.
    const breathe = (0.5 + 0.5 * flick) * (0.72 + 0.28 * Math.sin(tSec * 1.9));
    const hx = cx + Math.sin(tSec * 0.9) * 14;
    const hy = ground - 42 + Math.cos(tSec * 1.3) * 8;
    const R0 = Math.min(W, H) * 0.17 * breathe;
    const A0 = 0.85 * (0.55 + 0.45 * flick) * (0.62 + 0.38 * Math.sin(tSec * 2.1 + 1.4));
    const RMAX = Math.hypot(W, H) * 0.99;
    const LAYERS = 15;
    const FALLOFF = 0.9;

    ctx.globalCompositeOperation = "lighter";
    for (let L = 0; L < LAYERS; L++) {
      const Lt = L / (LAYERS - 1);
      const R = R0 + (RMAX - R0) * Math.pow(Lt, 0.72);
      const a = Math.max(0.06, A0 * Math.pow(R0 / R, FALLOFF));
      const m1 = Lt;
      const lr = col.gold[0] + (core[0] - col.gold[0]) * m1;
      const lg = col.gold[1] + (core[1] - col.gold[1]) * m1;
      const lb = col.gold[2] + (core[2] - col.gold[2]) * m1;
      const rg = ctx.createRadialGradient(hx, hy, R * 0.04, hx, hy, R);
      rg.addColorStop(0, `rgba(${lr | 0},${lg | 0},${lb | 0},${a.toFixed(3)})`);
      rg.addColorStop(0.72, `rgba(${lr | 0},${lg | 0},${lb | 0},${(a * 0.6).toFixed(3)})`);
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(hx - R, hy - R, R * 2, R * 2);
    }

    // 잔열 바닥 띠 — 전체 폭이 은은히 맥동(중심 좌우 유동) + 반대 위상 두 번째 점
    const hb = ground + 8;
    const hbW = W * 0.78;
    const hbX = cx + Math.sin(tSec * 0.5) * W * 0.3;
    const hbA = 0.12 * (0.6 + 0.4 * flick) * (0.7 + 0.3 * Math.sin(tSec * 1.2 + 2.0));
    const hbg = ctx.createRadialGradient(hbX, hb, 2, hbX, hb, hbW);
    hbg.addColorStop(0, `rgba(${col.ember[0]},${col.ember[1]},${col.ember[2]},${hbA.toFixed(3)})`);
    hbg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hbg;
    ctx.fillRect(0, hb - hbW, W, hbW * 2);
    const hb2X = cx - Math.sin(tSec * 0.5) * W * 0.3;
    const hbg2 = ctx.createRadialGradient(hb2X, hb, 2, hb2X, hb, hbW * 0.7);
    hbg2.addColorStop(0, `rgba(${col.rose[0]},${col.rose[1]},${col.rose[2]},${(hbA * 0.7).toFixed(3)})`);
    hbg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hbg2;
    ctx.fillRect(0, hb - hbW * 0.7, W, hbW * 1.4);

    for (let j = 0; j < parts.length; j++) {
      const q = parts[j];
      q.k -= K_BURN * dt;
      if (q.k <= 0) { spawn(q, rand); continue; }
      const baseX = logX(q.col, cx, W);
      const wx = baseX + q.x;
      const wy = ground + q.y;
      const cw = curl(field, wx, wy, tSec);
      q.vx += (cw[0] - q.vx) * Math.min(1, dt * 3.2);
      q.vy += (cw[1] - q.vy) * Math.min(1, dt * 3.2) - buoyRef.current * 190 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      const dxa = q.x / 26;
      const pull = Math.exp(-dxa * dxa) * 34 * dt;
      q.x -= q.x * pull * 0.06;
      const fx = baseX + q.x;
      const fy = ground + q.y;
      let rC: number, gC: number, bC: number, rad: number;
      if (q.k > 0.66) {
        rC = col.gold[0]; gC = col.gold[1]; bC = col.gold[2];
        rad = 2.2 + 1.5 * ((q.k - 0.66) / 0.34);
      } else if (q.k > 0.33) {
        const m2 = (q.k - 0.33) / 0.33;
        rC = col.gold[0] + (core[0] - col.gold[0]) * m2;
        gC = col.gold[1] + (core[1] - col.gold[1]) * m2;
        bC = col.gold[2] + (core[2] - col.gold[2]) * m2;
        rad = 1.7 + 0.5 * m2;
      } else {
        const m3 = q.k / 0.33;
        rC = core[0] + (col.ember[0] - core[0]) * (1 - m3);
        gC = core[1] + (col.ember[1] - core[1]) * (1 - m3);
        bC = core[2] + (col.ember[2] - core[2]) * (1 - m3);
        rad = 1.0 + 0.7 * m3;
      }
      ctx.fillStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},${(0.16 + 0.5 * q.k).toFixed(3)})`;
      ctx.fillRect(fx - rad, fy - rad, rad * 2, rad * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    const nCol = nColRef.current;
    for (let lg2 = 0; lg2 < nCol; lg2++) {
      const lx = logX(lg2, cx, W);
      const log: RGB = [
        col.ink[0] + (col.ember[0] - col.ink[0]) * 0.26,
        col.ink[1] + (col.ember[1] - col.ink[1]) * 0.26,
        col.ink[2] + (col.ember[2] - col.ink[2]) * 0.26,
      ];
      ctx.fillStyle = `rgb(${log[0] | 0},${log[1] | 0},${log[2] | 0})`;
      ctx.save();
      ctx.translate(lx, ground + 4);
      ctx.rotate((lg2 - (nCol - 1) / 2) * 0.3);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-22, -5, 44, 9, 4);
      else ctx.rect(-22, -5, 44, 9);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = `rgba(${col.ember[0]},${col.ember[1]},${col.ember[2]},0.5)`;
      ctx.fillRect(lx - 12, ground - 2, 24, 3);
    }
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 3.2;
      pxRef.current = 0.5 + 0.2 * Math.sin(ph + 0.4);
      pyRef.current = 0.5 + 0.3 * Math.sin(2 * ph + 0.7);
    }
    draw(t, dt);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onPoint(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    pyRef.current = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) draw(STILL_T, 0.016);
  }

  function onLeave(): void {
    if (manualRef.current) { pxRef.current = 0.5; pyRef.current = 0.5; }
  }

  function onKeyDown(e: KeyEvt): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.07, 0], ArrowRight: [0.07, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    if (!manualRef.current) manualRef.current = true;
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
    pyRef.current = Math.max(0, Math.min(1, pyRef.current + d[1]));
    if (reduced()) draw(STILL_T, 0.016);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    buoyRef.current = buoy;
    nColRef.current = columns;
    toneRef.current = tone;
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    buildParts();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T, 0.016);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(STILL_T, 0);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buoy, columns, tone]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>장작마다 솟은 불기둥이 포텐셜 필드의 컬(curl) 노이즈 바람에 접선으로 밀려 한 덩어리로 넘실댑니다 — 포인터로 장작 위치를 옮깁니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerMove={onPoint}
          onPointerLeave={onLeave}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{b}</b> 부력 계수 · <b className={styles.val}>{columns}</b>개 불기둥</span>
          <span className={styles.metaDim}>curl noise · lighter 합성</span>
        </div>
      </div>
    </main>
  );
}
