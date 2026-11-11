// StrikeFlash — vanilla 판(run/316/demo/08-lightning-flash-afterglow-fade/index.html) 의 React 포트.
// 중점변위 낙뢰가 떨어지는 순간 전면 플래시 광원을 최대치로 켠 뒤 매 프레임 flash *= DECAY 로
// 지수 감쇠시킨다. 실루엣(뒷산·앞 언덕·작은 탑)이 플래시에 함께 밝아졌다 식는 잔광이 주제다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StrikeFlash.module.scss";

export type StrikeFlashProps = {
  duration?: string;
  easing?: string;
  color?: string;
  decay?: number;       // 프레임당 플래시 감쇠율 — 1 에 가까울수록 잔광이 오래 남는다
  displacePx?: number;  // 중점변위 최대 폭 — 늘리면 줄기가 더 거칠어진다
  cycleMs?: number;     // 낙뢰 반복 주기(2000ms 의 약수 — gif 가 안 끊긴다)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Colors = { ink: RGB; sky: RGB; slab: RGB; ridge: RGB; core: RGB; lilac: RGB; mint: RGB };
type Star = { rx: number; ry: number; ph: number };

const FIELD_LABEL = "스트라이크 플래시 잔광 실험판";
const STILL_T = 60;    // reduce 에서 그리는 시각(ms) — 플래시가 살짝 남은 낙뢰 순간
const RIDGE_FR: [number, number][] = [
  [0.00, 0.66], [0.08, 0.60], [0.18, 0.68], [0.30, 0.58], [0.42, 0.64],
  [0.54, 0.56], [0.66, 0.62], [0.78, 0.58], [0.90, 0.63], [1.00, 0.60],
];
const HILL_FR: [number, number][] = [
  [0.00, 0.80], [0.10, 0.76], [0.24, 0.82], [0.38, 0.74], [0.52, 0.79],
  [0.66, 0.73], [0.80, 0.80], [0.92, 0.75], [1.00, 0.78],
];
const SEED = 0x517c08;

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

export default function StrikeFlash({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b9a0ff",
  decay = 0.95,
  displacePx = 30,
  cycleMs = 1000,
}: StrikeFlashProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colRef = useRef<Colors | null>(null);
  const decayRef = useRef(decay) as Box<number>;
  const dispRef = useRef(displacePx) as Box<number>;
  const cycleRef = useRef(cycleMs) as Box<number>;
  const boltRandRef = useRef(makePRNG(SEED)) as Box<() => number>;
  const starsRef = useRef<Star[]>([]) as Box<Star[]>;
  const flashRef = useRef(0) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
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

  function rgba(c: RGB, a: number): string { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(a: RGB, b: RGB, k: number): RGB {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  function ridgePath(ctx: CanvasRenderingContext2D, fr: [number, number][], W: number, H: number): void {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let i = 0; i < fr.length; i++) ctx.lineTo(fr[i][0] * W, fr[i][1] * H);
    ctx.lineTo(W, H);
    ctx.closePath();
  }

  // 낙뢰 — 시드를 주기 시작 시점에 고정해 매 주기 같은 줄기가 떨어진다
  function boltPoints(rand: () => number, x1: number, y1: number, x2: number, y2: number, disp: number): Pt[] {
    let pts: Pt[] = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    let amt = disp;
    for (let depth = 0; depth < 7; depth++) {
      const next: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const off = (rand() - 0.5) * 2 * amt;
        next.push({ x: mx + (-dy / len) * off, y: my + (dx / len) * off });
        next.push(b);
      }
      pts = next;
      amt *= 0.55;
    }
    return pts;
  }

  // 낙뢰 봉투 — 0~120ms 스트로크(밝게 유지), 120~320ms 급격히 소멸
  function boltAlpha(t: number): number {
    if (t < 0 || t > 320) return 0;
    if (t < 120) return 1;
    return 1 - (t - 120) / 200;
  }

  // 밤하늘 별빛 — 플래시가 다 식은 휴지 구간에도 화면이 완전히 죽지 않게 하는 안전판
  // 반짝임은 45ms 계단(scintillation) — 부드러운 사인파는 프레임간 변화가 픽셀 문턱 아래로 내려간다
  function buildStars(): void {
    const rand = makePRNG(SEED + 11);
    const stars: Star[] = [];
    for (let i = 0; i < 20; i++) {
      stars.push({ rx: rand(), ry: rand() * 0.55, ph: (rand() * 97) | 0 });
    }
    starsRef.current = stars;
  }

  // 정수 해시(murmur3 혼합) — (별 번호, 계단) → 0~1 유사난수. 시드 고정이라 렌더링이 결정론적이다
  function starHash(a: number, b: number): number {
    let h = (a * 374761393 + b * 668265263) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function draw(tAbs: number, t: number, dt: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    if (!ctx || !col) return;
    const { w: W, h: H } = sizeRef.current;

    flashRef.current *= Math.pow(decayRef.current, dt * 60);
    if (t < 120) flashRef.current = 1;
    const flash = flashRef.current;

    const skyCol = mix(col.sky, col.lilac, flash * 0.5);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = rgba(skyCol, 1);
    ctx.fillRect(0, 0, W, H);

    const stars = starsRef.current;
    const starStep = (tAbs / 45) | 0;
    for (let si = 0; si < stars.length; si++) {
      const st = stars[si];
      const sa = 0.14 + 0.62 * starHash(si + st.ph, starStep);
      ctx.fillStyle = rgba(col.mint, sa);
      ctx.fillRect(st.rx * W, st.ry * H, 2.2, 2.2);
    }

    // 플래시 광원 — 낙뢰 상단에서 퍼지는 방사형 그라디언트
    if (flash > 0.02) {
      const gr = ctx.createRadialGradient(W * 0.5, H * 0.04, 4, W * 0.5, H * 0.04, H * 1.1);
      gr.addColorStop(0, rgba(col.core, flash * 0.85));
      gr.addColorStop(0.35, rgba(col.lilac, flash * 0.4));
      gr.addColorStop(1, rgba(col.lilac, 0));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }

    ridgePath(ctx, RIDGE_FR, W, H);
    ctx.fillStyle = rgba(mix(col.ridge, col.mint, flash * 0.24), 1);
    ctx.fill();

    const ba = boltAlpha(t);
    if (ba > 0.01) {
      const rand = boltRandRef.current;
      // 시드를 되돌려 매 주기 같은 줄기가 반복 떨어지게 한다
      boltRandRef.current = makePRNG(SEED);
      const strikeX = W * 0.5 + W * 0.08 * Math.sin(SEED % 7);
      const pts = boltPoints(boltRandRef.current, strikeX, H * 0.02, strikeX + W * 0.06, H * 0.72, dispRef.current);
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      const passes: [number, number][] = [[10, 0.15], [6, 0.25], [3.2, 0.42]];
      for (let p = 0; p < passes.length; p++) {
        ctx.strokeStyle = rgba(col.lilac, passes[p][1] * ba);
        ctx.lineWidth = passes[p][0];
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(col.core, Math.min(1, ba * 1.1));
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
      ctx.stroke();
      const tip = pts[pts.length - 1];
      const gg = ctx.createRadialGradient(tip.x, tip.y, 1, tip.x, tip.y, 46);
      gg.addColorStop(0, rgba(col.core, ba));
      gg.addColorStop(1, rgba(col.core, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      void rand;
    }

    ridgePath(ctx, HILL_FR, W, H);
    ctx.fillStyle = rgba(mix(col.slab, col.lilac, flash * 0.16), 1);
    ctx.fill();

    const tx = W * 0.78, ty = H * 0.73;
    ctx.fillStyle = rgba(mix(col.slab, col.lilac, flash * 0.2), 1);
    ctx.fillRect(tx - 2, ty - 16, 4, 16);
    ctx.fillRect(tx - 5, ty - 3, 10, 3);
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
    buildStars();
  }

  let t0 = -1;
  let prev = 0;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; prev = now; }
    const t = (now - t0) % cycleRef.current;
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    draw(now - t0, t, dt);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    decayRef.current = decay;
    dispRef.current = displacePx;
    cycleRef.current = cycleMs;
    colRef.current = {
      ink: tokRGB(root, "--bolt-ink"),
      sky: tokRGB(root, "--bolt-sky"),
      slab: tokRGB(root, "--bolt-slab"),
      ridge: tokRGB(root, "--bolt-ridge"),
      core: tokRGB(root, "--bolt-core"),
      lilac: tokRGB(root, "--bolt-lilac"),
      mint: tokRGB(root, "--bolt-mint"),
    };
    fit();
    function onResize(): void { fit(); if (reduced()) draw(STILL_T, STILL_T, 0.016); }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      flashRef.current = 0.4;
      draw(STILL_T, STILL_T, 0.016);
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decay, displacePx, cycleMs]);

  const rootCls = still ? `${styles.cd} ${styles.isStill}` : styles.cd;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M208 64h-32l-16-24H96L80 64H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-80 104a36 36 0 1 1 36-36a36 36 0 0 1-36 36" opacity=".2" /><path d="M208 56h-27.72l-13.63-20.44A8 8 0 0 0 160 32H96a8 8 0 0 0-6.65 3.56L75.71 56H48a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h160a24 24 0 0 0 24-24V80a24 24 0 0 0-24-24m8 136a8 8 0 0 1-8 8H48a8 8 0 0 1-8-8V80a8 8 0 0 1 8-8h32a8 8 0 0 0 6.66-3.56L100.28 48h55.43l13.63 20.44A8 8 0 0 0 176 72h32a8 8 0 0 1 8 8ZM128 88a44 44 0 1 0 44 44a44.05 44.05 0 0 0-44-44m0 72a28 28 0 1 1 28-28a28 28 0 0 1-28 28" /></g></svg>
          <span>낙뢰 프레임에 전면 플래시 광원의 세기를 최대로 올린 뒤 매 프레임 이전 값에 감쇠율을 곱합니다 — 실루엣 언덕까지 잠깐 밝아졌다가 사진 플래시처럼 지수로 식는 잔광입니다</span>
        </p>
        <div className={styles.field} ref={fieldRef} role="application" aria-label={FIELD_LABEL} tabIndex={0}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>감쇠율 <b className={styles.val}>0.95</b> · 잔광 프레임</span>
          <span className={styles.metaDim}>fillRect · globalCompositeOperation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
