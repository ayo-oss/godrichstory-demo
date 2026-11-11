// DuneRidge — vanilla 판(run/309/demo/06-terrain-dune-ridge/index.html) 의 React 포트.
// 1차원 값 노이즈 fbm 을 리지드(1-|2n-1|) 변형해 능선을 뾰족하게 세우고, 앞뒤 두 겹을
// 서로 다른 globalAlpha 로 칠해 사막이 겹겹이 물러나는 원근을 만든다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DuneRidge.module.scss";

export type DuneRidgeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const OCT = 4;
const FAR_SCALE = 0.014, FAR_FLOW = 17.0, FAR_OFFSET = 31.4;
const NEAR_SCALE = 0.026, NEAR_FLOW = 23.0, NEAR_OFFSET = 157.2;

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

export default function DuneRidge({
  duration = "2s",
  easing = "ease-out",
  color = "#c93000",
}: DuneRidgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const permRef = useRef(new Uint8Array(512)) as Box<Uint8Array>;
  const valRef = useRef(new Float32Array(256)) as Box<Float32Array>;
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const [seed, setSeed] = useState(7);
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 시드 → PERM(순서표)·VAL(격자점 난수값) 재생성 — 시드 UI 가 이걸 다시 부른다
  function buildTables(sd: number): void {
    const rng = mulberry32(sd >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = permRef.current, val = valRef.current;
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (let i = 0; i < 256; i++) val[i] = rng();
  }

  // 1차원 값 노이즈 — 격자점마다 난수를 하나 두고 그 사이를 fade 로 부드럽게 잇는다
  function vnoise1(x: number): number {
    const perm = permRef.current, val = valRef.current;
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = val[perm[xi & 255]], b = val[perm[(xi + 1) & 255]];
    return a + (b - a) * fade(xf);
  }

  // 리지드 fbm — vnoise1(0..1) 을 -1..1 로 펴고 절댓값 반전(1-|n|) 해 능선을 뾰족하게 만든다.
  // 옥타브마다 자기 위상을 따로 흘려보내 능선이 시간에 따라 부위별로 다시 깎인다.
  function ridgedFbm1(x: number, sec: number, flow: number): number {
    let sum = 0, amp = 0.55, norm = 0, f = 1;
    for (let i = 0; i < OCT; i++) {
      const phase = sec * flow * (i + 1);
      const n = vnoise1(x * f + phase);
      const s = n * 2 - 1;
      const r = 1 - Math.abs(s);
      sum += r * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
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
  }

  function duneY(x: number, scale: number, offset: number, base: number, amp: number, sec: number, flow: number): number {
    const n = ridgedFbm1(x * scale + offset, sec, flow);
    return base - n * amp;
  }

  function drawDune(
    ctx: CanvasRenderingContext2D, sec: number, scale: number, offset: number,
    base: number, amp: number, flow: number, topColor: string, bottomColor: string, alpha: number,
  ): void {
    const W = sizeRef.current.w, H = sizeRef.current.h;
    const step = 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += step) {
      const xx = x > W ? W : x;
      ctx.lineTo(xx, duneY(xx, scale, offset, base, amp, sec, flow));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, H);
    g.addColorStop(0, topColor);
    g.addColorStop(1, bottomColor);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  function tok(name: string): string {
    const root = rootRef.current;
    if (!root) return "#000";
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current;
    const root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, tok("--sky-top"));
    sky.addColorStop(1, tok("--sky-bottom"));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawDune(ctx, sec, FAR_SCALE, FAR_OFFSET, H * 0.46, H * 0.46, FAR_FLOW, tok("--far-top"), tok("--far-bottom"), 0.68);
    drawDune(ctx, sec, NEAR_SCALE, NEAR_OFFSET, H * 0.84, H * 0.72, NEAR_FLOW, tok("--near-top"), tok("--near-bottom"), 1.0);
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeed(e: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(e.target.value)) || 1));
    setSeed(v);
    buildTables(v);
    if (reduced()) paint(0);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(0);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    buildTables(seed);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      setStill(true);
      paint(0);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cls = [styles.root, still ? styles.isStill : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M144 52a20 20 0 1 1 20 20a20 20 0 0 1-20-20m49.44 55.92a8 8 0 0 0-13.77 0l-33 55.75l-21-35.67H50.35L8 200h240Z" opacity=".2"/><path d="M164 80a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0-40a12 12 0 1 1-12 12a12 12 0 0 1 12-12m90.88 155.92l-54.56-92.08A15.87 15.87 0 0 0 186.55 96a15.85 15.85 0 0 0-13.76 7.84L146.63 148l-44.84-76.1a16 16 0 0 0-27.58 0L1.11 195.94A8 8 0 0 0 8 208h240a8 8 0 0 0 6.88-12.08M88 80l23.57 40H64.43ZM22 192l33-56h66l33 56Zm150.57 0l-16.66-28.28L186.55 112L234 192Z"/></g></svg>
          <span>시드를 바꾸면 능선이 다른 사막으로 다시 접힙니다</span>
        </p>
        <div className={styles.field} ref={fieldRef}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" min={1} max={9999} step={1} value={seed} aria-label="사구 시드" onChange={onSeed} />
          </label>
        </div>
      </div>
    </main>
  );
}
