// FireFireworkBurst — vanilla 판(run/314/demo/06-fire-firework-burst/index.html) 의 React 포트.
// 한 점에서 방사형으로 튀어나간 파편이 중력(vy += g·dt)·항력·연료 소모(색온도 사다리)로
// 포물선을 그리며 식어 사라진다. 발사 스케줄은 시드 고정 PRNG 로 같은 안무가 반복된다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FireFireworkBurst.module.scss";

export type FireFireworkBurstProps = {
  duration?: string;
  easing?: string;
  color?: string;
  perBurst?: number;   // 폭발당 파편 수 — 변형 "파편 수" 축
  gravity?: number;    // 중력(px/s²) — 변형 "중력" 축
  period?: number;     // 자동 발사 주기(s) — 변형 "주기" 축
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type PointerEvt = { clientX: number; clientY: number };
type KeyEvt = { key: string; preventDefault(): void };
type RGB = [number, number, number];
type Frag = { live: boolean; x: number; y: number; vx: number; vy: number; k: number; tone: number };
type Colors = { ink: RGB; amber: RGB; gold: RGB; rose: RGB; ember: RGB; smoke: RGB };

const TAU = Math.PI * 2;
const FIELD_LABEL = "불꽃놀이 폭발 실험판";
const BURN = 0.34;      // 연료 소모율 (1/s) — 재튜닝(2026-09-15): 0.62→0.34, 잔불 수명↑
const DRAG = 0.985;     // 매 프레임 속도 유지율
const STILL_T = 2.4;    // reduce 에서 그리는 시각

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

// 색온도 사다리 — 흰 섬광 → gold → amber → ember → 잔불 깜빡임
function fragColor(k: number, tone: number, tSec: number, ph: number, col: Colors): RGB {
  const white: RGB = [255, 250, 244];
  if (k > 0.92) {
    const m0 = (k - 0.92) / 0.2;
    return [
      col.gold[0] + (white[0] - col.gold[0]) * m0,
      col.gold[1] + (white[1] - col.gold[1]) * m0,
      col.gold[2] + (white[2] - col.gold[2]) * m0,
    ];
  }
  if (k > 0.64) {
    const m1 = (k - 0.64) / 0.28;
    const lo = tone ? col.rose : col.gold;
    const hi = tone ? col.gold : col.amber;
    return [
      lo[0] + (hi[0] - lo[0]) * m1,
      lo[1] + (hi[1] - lo[1]) * m1,
      lo[2] + (hi[2] - lo[2]) * m1,
    ];
  }
  if (k > 0.34) {
    const m2 = (k - 0.34) / 0.3;
    const lo2 = tone ? col.rose : col.amber;
    return [
      lo2[0] + (col.ember[0] - lo2[0]) * m2,
      lo2[1] + (col.ember[1] - lo2[1]) * m2,
      lo2[2] + (col.ember[2] - lo2[2]) * m2,
    ];
  }
  const m3 = k / 0.34;
  const tw = 0.55 + 0.45 * Math.sin(tSec * 9 + ph);
  return [
    col.ink[0] + (col.ember[0] - col.ink[0]) * m3 * tw,
    col.ink[1] + (col.ember[1] - col.ink[1]) * m3 * tw,
    col.ink[2] + (col.ember[2] - col.ink[2]) * m3 * tw,
  ];
}

export default function FireFireworkBurst({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#f6cf8a",
  perBurst = 170,
  gravity = 34,
  period = 0.85,
}: FireFireworkBurstProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const pbRef = useRef(perBurst) as Box<number>;
  const gRef = useRef(gravity) as Box<number>;
  const perRef = useRef(period) as Box<number>;
  const poolRef = useRef<Frag[]>([]) as Box<Frag[]>;
  const aliveRef = useRef(0) as Box<number>;
  const nextRef = useRef(0.62) as Box<number>;
  const schedRef = useRef(makePRNG(0x5eed06)) as Box<() => number>;
  const pxRef = useRef(0.5) as Box<number>;
  const manualRef = useRef(false) as Box<boolean>;
  const rafRef = useRef(0) as Box<number>;
  const t0Ref = useRef(-1) as Box<number>;
  const prevRef = useRef(0) as Box<number>;
  const [alive, setAlive] = useState(0);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

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

  // 파편 풀 — prop 변경 시 리빌드. 재튜닝(2026-09-15): 동시 다발 폭발 대비 풀 여유(6→10)
  function buildPool(): void {
    const MAXP = pbRef.current * 10;
    const pool: Frag[] = [];
    for (let i = 0; i < MAXP; i++) {
      pool.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, k: 0, tone: 0 });
    }
    poolRef.current = pool;
  }

  // 폭발 — 균등 각도 + 시드 지터 + 안팎 두 겹
  function burst(x: number, y: number, tone: number): void {
    const pool = poolRef.current;
    const rand = schedRef.current;
    const n = pbRef.current;
    let placed = 0;
    for (let i = 0; i < pool.length && placed < n; i++) {
      const p = pool[i];
      if (p.live) continue;
      const ang = (placed / n) * TAU + (rand() - 0.5) * 0.22;
      const shell = placed % 5 === 0 ? 0.62 : 1.0;
      const sp = (46 + rand() * 58) * shell;
      p.live = true;
      p.x = x; p.y = y;
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp - 12;
      p.k = 0.85 + rand() * 0.3;
      p.tone = tone;
      placed++;
    }
  }

  function draw(tSec: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;
    const pool = poolRef.current;

    // 1) 밤하늘 — 잉크 + 위쪽 대기광
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${col.ink[0]},${col.ink[1]},${col.ink[2]})`;
    ctx.fillRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgba(${col.smoke[0]},${col.smoke[1]},${col.smoke[2]},0.05)`);
    sky.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const wind = (pxRef.current - 0.5) * 14;

    // 2) 파편 — lighter 합성
    ctx.globalCompositeOperation = "lighter";
    let live = 0;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (!p.live) continue;
      p.vy += gRef.current * dt;
      p.vx = p.vx * DRAG + wind * dt;
      p.vy *= DRAG;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.k -= BURN * dt;
      if (p.k <= 0 || p.y > H + 6 || p.x < -6 || p.x > W + 6) { p.live = false; continue; }
      live++;
      const c = fragColor(p.k, p.tone, tSec, i * 1.7, col);
      const rad = 0.9 + p.k * 1.5;
      const a = p.k > 0.34 ? 0.85 : 0.35 + p.k * 1.5;
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.min(1, a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, TAU);
      ctx.fill();
      if (p.k > 0.5) {
        ctx.strokeStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.25)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.08, p.y - p.vy * 0.08);
        ctx.stroke();
      }
    }
    aliveRef.current = live;

    // 3) 지평선
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(${col.ink[0]},${col.ink[1]},${col.ink[2]},0.9)`;
    ctx.fillRect(0, H * 0.94, W, H * 0.06 + 1);
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
  }

  function frame(now: number): void {
    if (t0Ref.current < 0) t0Ref.current = now;
    const t = (now - t0Ref.current) / 1000;
    const dt = Math.min(0.05, (now - (prevRef.current || now)) / 1000);
    prevRef.current = now;
    const rand = schedRef.current;
    const { w: W, h: H } = sizeRef.current;
    // 재튜닝(2026-09-15): 한 번에 2~3발 동시 발사 — 여러 궤적이 함께 살아 있게
    if (t >= nextRef.current) {
      const nBursts = rand() < 0.4 ? 2 : 3;
      for (let b = 0; b < nBursts; b++) {
        const lx = W * (0.12 + rand() * 0.76);
        const ly = H * (0.12 + rand() * 0.42);
        burst(lx, ly, rand() < 0.4 ? 1 : 0);
      }
      nextRef.current = t + perRef.current * (0.7 + rand() * 0.6);
    }
    if (!manualRef.current) {
      const ph = (t * TAU) / 3.6;
      pxRef.current = 0.5 + 0.4 * Math.sin(ph + 0.3);
    }
    draw(t, dt);
    setAlive(aliveRef.current);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onDown(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    burst(x, y, x / Math.max(1, r.width) < 0.5 ? 0 : 1);
    if (!manualRef.current) manualRef.current = true;
    if (reduced()) { draw(STILL_T, 0.016); setAlive(aliveRef.current); }
  }

  function onMove(e: PointerEvt): void {
    const field = fieldRef.current;
    if (!field) return;
    const r = field.getBoundingClientRect();
    pxRef.current = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const rand = schedRef.current;
      const { w: W, h: H } = sizeRef.current;
      burst(W * (0.3 + rand() * 0.4), H * (0.2 + rand() * 0.3), rand() < 0.5 ? 1 : 0);
      if (!manualRef.current) manualRef.current = true;
      if (reduced()) { draw(STILL_T, 0.016); setAlive(aliveRef.current); }
      return;
    }
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0],
    };
    const d = deltas[e.key];
    if (!d) return;
    e.preventDefault();
    pxRef.current = Math.max(0, Math.min(1, pxRef.current + d[0]));
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    pbRef.current = perBurst;
    gRef.current = gravity;
    perRef.current = period;
    schedRef.current = makePRNG(0x5eed06);
    colRef.current = {
      ink: tokRGB(root, "--fire-ink"),
      amber: tokRGB(root, "--fire-amber"),
      gold: tokRGB(root, "--fire-gold"),
      rose: tokRGB(root, "--fire-rose"),
      ember: tokRGB(root, "--fire-ember"),
      smoke: tokRGB(root, "--fire-smoke"),
    };
    buildPool();
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(STILL_T, 0.016);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      const { w: W, h: H } = sizeRef.current;
      burst(W * 0.28, H * 0.3, 0);
      burst(W * 0.7, H * 0.2, 1);
      burst(W * 0.5, H * 0.42, 0);
      for (let s = 0; s < 46; s++) draw(STILL_T + s * 0.016, 0.016);
      draw(STILL_T, 0);
      setAlive(aliveRef.current);
      setStill(true);
    } else {
      // 오프닝 폭발 — 첫 프레임부터 하늘에 궤적이 살아 있게(재튜닝: 정적 오프닝 제거)
      const { w: W, h: H } = sizeRef.current;
      burst(W * 0.3, H * 0.3, 0);
      burst(W * 0.68, H * 0.22, 1);
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perBurst, gravity, period]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M128 24a16 16 0 0 1 16 16v8a80.06 80.06 0 0 1 63.94 63.94h8a16 16 0 0 1 0 32h-8A80.06 80.06 0 0 1 144 207.94v8a16 16 0 0 1-32 0v-8A80.06 80.06 0 0 1 48.06 144h-8a16 16 0 0 1 0-32h8A80.06 80.06 0 0 1 112 48.06v-8A16 16 0 0 1 128 24m-16 57.35V96a16 16 0 0 0 32 0V81.35A48.09 48.09 0 0 0 81.35 112H96a16 16 0 0 0 0-32h14.65M174.65 144H160a16 16 0 0 0 0 32h14.65A48.09 48.09 0 0 0 144 174.65V160a16 16 0 0 0-32 0v14.65A48.09 48.09 0 0 0 81.35 144" opacity=".2"/><path d="M232 128a104 104 0 1 1-104-104a104 104 0 0 1 104 104m-32 0a8 8 0 0 0-8-8h-9.34A56.1 56.1 0 0 0 136 77.34V68a8 8 0 0 0-16 0v9.34A56.1 56.1 0 0 0 77.34 120H68a8 8 0 0 0 0 16h9.34A56.1 56.1 0 0 0 120 179.66V188a8 8 0 0 0 16 0v-8.34A56.1 56.1 0 0 0 178.66 136H192a8 8 0 0 0 8-8m-40 0a32 32 0 1 1-32-32a32 32 0 0 1 32 32m-16 0a16 16 0 1 0-16 16a16 16 0 0 0 16-16"/></g></svg>
          <span>파편이 중력으로 포물선을 그리며 색온도대로 식어 사라집니다 — 클릭으로 직접 터뜨립니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onKeyDown={onKeyDown}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{alive}</b> 살아 있는 파편 · g {gravity}px/s²</span>
          <span className={styles.metaDim}>lighter 합성 · 색온도 사다리</span>
        </div>
      </div>
    </main>
  );
}
