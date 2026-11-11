// CandleWick — vanilla 판(run/314/demo/01-fire-candle-wick/index.html) 의 React 포트.
// 심지 끝에서 태어난 연료 입자가 부력으로 오르며 색온도(gold→amber/rose→ember)로 식고,
// 후광 3겹이 살아있는 연료 총합(flick)으로 숨쉰다. 미리보기는 시드 고정 Lissajous 가상 바람.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CandleWick.module.scss";

export type CandleWickProps = {
  duration?: string;
  easing?: string;
  color?: string;
  particles?: number;   // 연료 입자 수 — 변형 "입자 수" 축(240 → 480)
  lift?: number;        // 부력 배율 — 불꽃 높이 축
  tone?: 0 | 1;         // 코어 색 변형 — 0: amber, 1: rose
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다 — 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Frag = { x: number; y: number; vx: number; vy: number; k: number; ph: number };
type Smk = { x: number; y: number; vx: number; vy: number; k: number; ph: number };
type Colors = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "촛불 파티클 실험판";
const STILL_T = 1.6;    // reduce 에서 그리는 시각
const K_BURN = 2.3;     // 연료 소모율 (1/s)
const SMK = 14;

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

export default function CandleWick({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f0a868",
  particles = 240,
  lift = 1.0,
  tone = 0,
}: CandleWickProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const npRef = useRef(particles) as Box<number>;
  const liftRef = useRef(lift) as Box<number>;
  const toneRef = useRef(tone) as Box<number>;
  const partsRef = useRef<Frag[]>([]) as Box<Frag[]>;
  const smokesRef = useRef<Smk[]>([]) as Box<Smk[]>;
  const pxRef = useRef(0.5) as Box<number>;
  const pyRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(particles));
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

  // 입자·연기 풀 리빌드 — particles prop 이 바뀌거나 최초 마운트 때
  function buildParts(): void {
    const rand = makePRNG(0x5eed01);
    const n2 = npRef.current;
    const arr: Frag[] = [];
    for (let i = 0; i < n2; i++) {
      arr.push({
        x: (rand() - 0.5) * 3,
        y: -rand() * 42,
        vx: (rand() - 0.5) * 7,
        vy: -20 - rand() * 28,
        k: rand(),
        ph: rand() * TAU,
      });
    }
    partsRef.current = arr;
    const rand2 = makePRNG(0x5eed01 + 991);
    const sm: Smk[] = [];
    for (let i = 0; i < SMK; i++) {
      sm.push({
        x: (rand2() - 0.5) * 6,
        y: -rand2() * 72,
        vx: (rand2() - 0.5) * 6,
        vy: -13 - rand2() * 13,
        k: rand2(),
        ph: rand2() * TAU,
      });
    }
    smokesRef.current = sm;
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
    setN(String(npRef.current));
  }

  function spawn(f: Frag, rand: () => number): void {
    f.x = (rand() - 0.5) * 3;
    f.y = 0;
    f.vx = (rand() - 0.5) * 7;
    f.vy = -20 - rand() * 28;
    f.k = 1;
    f.ph = rand() * TAU;
  }

  function spawnSmk(s: Smk, rand: () => number): void {
    s.x = (rand() - 0.5) * 6;
    s.y = 0;
    s.vx = (rand() - 0.5) * 6;
    s.vy = -13 - rand() * 13;
    s.k = 1;
    s.ph = rand() * TAU;
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const parts = partsRef.current;
    const smokes = smokesRef.current;
    if (!ctx || !col || parts.length === 0) return;
    const { w: W, h: H } = sizeRef.current;
    const rand = makePRNG(0x5eed01 + ((tSec * 61) | 0));
    const core = coreRGB(col);

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);

    const cx = W * 0.5;
    const ground = H * 0.88;
    const candleTop = ground - 54;
    const wickTop = candleTop - 9;
    const wind = (pxRef.current - 0.5) * 2;
    const power = 0.6 + pyRef.current * 0.8;

    let flick = 0;
    for (let f = 0; f < parts.length; f++) flick += parts[f].k;
    flick = (flick / parts.length) * power;
    // 앙비언트 글로우 — 반경이 breathe 로 진동하고 알파는 flick·sin 펄스로 매 프레임 재계산.
    // 겹마다 그라디언트 정지점이 재배치되어 화면 넓은 영역이 실제로 변한다.
    const breathe = (0.62 + 0.38 * flick) * (0.82 + 0.18 * Math.sin(tSec * 1.9));
    const hx = cx + wind * 26;
    const hy = wickTop - 17 - (power - 1) * 10 + Math.sin(tSec * 1.7) * 5;
    const R0 = Math.min(W, H) * 0.13 * breathe;
    const A0 = 0.60 * (0.66 + 0.34 * flick) * (0.72 + 0.28 * Math.sin(tSec * 2.3 + 0.9));
    const RMAX = Math.hypot(W, H) * 0.99;
    const LAYERS = 13;
    const FALLOFF = 1.05;

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
    const hb = ground + 6;
    const hbW = W * 0.75;
    const hbX = cx + Math.sin(tSec * 0.6) * W * 0.3;
    const hbA = 0.12 * (0.6 + 0.4 * flick) * (0.7 + 0.3 * Math.sin(tSec * 1.3 + 2.0));
    const hbg = ctx.createRadialGradient(hbX, hb, 2, hbX, hb, hbW);
    hbg.addColorStop(0, `rgba(${col.ember[0]},${col.ember[1]},${col.ember[2]},${hbA.toFixed(3)})`);
    hbg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hbg;
    ctx.fillRect(0, hb - hbW, W, hbW * 2);
    const hb2X = cx - Math.sin(tSec * 0.6) * W * 0.3;
    const hbg2 = ctx.createRadialGradient(hb2X, hb, 2, hb2X, hb, hbW * 0.7);
    hbg2.addColorStop(0, `rgba(${col.rose[0]},${col.rose[1]},${col.rose[2]},${(hbA * 0.7).toFixed(3)})`);
    hbg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hbg2;
    ctx.fillRect(0, hb - hbW * 0.7, W, hbW * 1.4);

    for (let j = 0; j < parts.length; j++) {
      const q = parts[j];
      q.k -= K_BURN * dt;
      if (q.k <= 0) { spawn(q, rand); continue; }
      const sway = Math.sin(tSec * 7.3 + q.ph) * 8 * q.k;
      const fx = cx + q.x + q.vx * q.k + sway + wind * (1 - q.k) * 26;
      const fy = wickTop + q.y * (0.6 + 0.4 * power);
      q.x += q.vx * dt;
      q.y += q.vy * liftRef.current * dt;
      let rC: number, gC: number, bC: number, rad: number;
      if (q.k > 0.66) {
        rC = col.gold[0]; gC = col.gold[1]; bC = col.gold[2];
        rad = 2.4 + 1.6 * ((q.k - 0.66) / 0.34);
      } else if (q.k > 0.33) {
        const m2 = (q.k - 0.33) / 0.33;
        rC = col.gold[0] + (core[0] - col.gold[0]) * m2;
        gC = col.gold[1] + (core[1] - col.gold[1]) * m2;
        bC = col.gold[2] + (core[2] - col.gold[2]) * m2;
        rad = 1.8 + 0.6 * m2;
      } else {
        const m3 = q.k / 0.33;
        rC = core[0] + (col.ember[0] - core[0]) * (1 - m3);
        gC = core[1] + (col.ember[1] - core[1]) * (1 - m3);
        bC = core[2] + (col.ember[2] - core[2]) * (1 - m3);
        rad = 1.0 + 0.8 * m3;
      }
      ctx.fillStyle = `rgba(${rC | 0},${gC | 0},${bC | 0},${(0.16 + 0.5 * q.k).toFixed(3)})`;
      ctx.fillRect(fx - rad, fy - rad, rad * 2, rad * 2);
    }

    for (let m = 0; m < smokes.length; m++) {
      const s2 = smokes[m];
      s2.k -= 0.55 * dt;
      if (s2.k <= 0) { spawnSmk(s2, rand); continue; }
      const sx = cx + s2.x + s2.vx * (1 - s2.k) + Math.sin(tSec * 1.6 + s2.ph) * 6 * (1 - s2.k) + wind * (1 - s2.k) * 34;
      const sy = wickTop - 46 + s2.y;
      s2.x += s2.vx * dt;
      s2.y += s2.vy * dt;
      const sr = 1.5 + (1 - s2.k) * 4;
      ctx.fillStyle = `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},${(0.1 * s2.k).toFixed(3)})`;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }

    ctx.globalCompositeOperation = "source-over";
    const wax: RGB = [
      col.ink[0] + (col.amber[0] - col.ink[0]) * 0.2,
      col.ink[1] + (col.amber[1] - col.ink[1]) * 0.2,
      col.ink[2] + (col.amber[2] - col.ink[2]) * 0.2,
    ];
    ctx.fillStyle = `rgb(${wax[0] | 0},${wax[1] | 0},${wax[2] | 0})`;
    ctx.fillRect(cx - 11, candleTop, 22, ground - candleTop);
    ctx.beginPath();
    ctx.ellipse(cx, candleTop, 11, 3.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(${col.gold[0]},${col.gold[1]},${col.gold[2]},0.12)`;
    ctx.fillRect(wind > 0 ? cx + 6 : cx - 10, candleTop + 2, 4, ground - candleTop - 4);
    ctx.strokeStyle = `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},0.55)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, candleTop + 2);
    ctx.lineTo(cx + wind * 2, wickTop);
    ctx.stroke();
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    if (!manualRef.current) {
      const ph = (t * TAU) / 3.2;
      pxRef.current = 0.5 + 0.34 * Math.sin(ph + 0.4);
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
    npRef.current = particles;
    liftRef.current = lift;
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
  }, [particles, lift, tone]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>심지에서 태어난 연료 입자가 부력으로 오르며 노랑→주황→빨강으로 색온도가 내려갑니다 — 포인터 x 는 바람, y 는 화력</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>개 연료 입자 · 색온도 냉각</span>
          <span className={styles.metaDim}>fillRect · globalCompositeOperation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
