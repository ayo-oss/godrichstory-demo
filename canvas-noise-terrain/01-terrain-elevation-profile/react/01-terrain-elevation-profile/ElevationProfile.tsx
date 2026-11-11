// ElevationProfile — vanilla 판(run/309/demo/01-terrain-elevation-profile/index.html) 의 React 포트.
// 1차원 값 노이즈를 옥타브 4겹(fbm) 으로 겹쳐 산 능선 실루엣 한 줄을 lineTo 로 그린다.
// 3D 회전·원근 투영은 안 쓴다 — 가로 위치마다 fbm(x) 값을 높이로 읽는 순수 2D 단면이다.
// 옥타브마다 독립된 위상을 시간에 흘려 능선이 조금씩 다시 깎이는 것처럼 보이게 한다.
// 원경·근경 두 겹을 겹쳐 그려 입체감을 준다. 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 는 없다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./ElevationProfile.module.scss";

export type ElevationProfileProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type InputEvt = { target: { value: string } };

const OCT = 4;   // 옥타브 4겹
const FAR_SCALE = 0.011, FAR_FLOW = 8.5, FAR_OFFSET = 13.7;
const NEAR_SCALE = 0.021, NEAR_FLOW = 12.0, NEAR_OFFSET = 241.3;

// 결정적 난수 — mulberry32. 같은 시드면 같은 수열을 돌려준다
function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    const t = Math.imul(a ^ (a >>> 15), 1 | a);
    const u = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((u ^ (u >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);   // 스무스스텝 — 격자 경계에서 각이 안 지게
}

// 1차원 값 노이즈 테이블 — 시드가 바뀌면 다시 짠다
class ValueNoise1 {
  perm: Uint8Array;
  val: Float32Array;

  constructor(seed: number) {
    const rng = mulberry32(seed >>> 0);
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.val = new Float32Array(256);
    for (let i = 0; i < 256; i++) this.val[i] = rng();
  }

  at(x: number): number {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = this.val[this.perm[xi & 255]], b = this.val[this.perm[(xi + 1) & 255]];
    return a + (b - a) * fade(xf);
  }
}

// fbm — 주파수 2배·진폭 절반으로 4겹. 옥타브마다 자기 위상을 따로 흘려보내
// (i+1) 배로 밀기 때문에 고주파 옥타브일수록 더 빨리 밀리고 — 능선이 부위별로 다시 깎인다
function fbm1(n: ValueNoise1, x: number, sec: number, flow: number): number {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < OCT; i++) {
    const phase = sec * flow * (i + 1);
    sum += n.at(x * f + phase) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

export default function ElevationProfile({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "ease-out",                        // vanilla $easing: $ease-out
  color = "#8fdac2",                          // vanilla $color: $terrain-mint (근사값)
}: ElevationProfileProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const seedRef = useRef<HTMLInputElement | null>(null);
  const noiseRef = useRef<ValueNoise1 | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const rafRef = useRef(0) as Box<number>;
  const stillRef = useRef(false) as Box<boolean>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildTables(seed: number): void {
    noiseRef.current = new ValueNoise1(seed);
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

  function ridgeY(x: number, scale: number, offset: number, base: number, amp: number, sec: number, flow: number): number {
    const n = noiseRef.current;
    if (!n) return base;
    let v = fbm1(n, x * scale + offset, sec, flow);
    v = v * 1.6 - 0.3;                          // 값 노이즈는 가운데로 몰린다 — 대비를 한 번 펴 준다
    if (v < 0) v = 0; else if (v > 1) v = 1;
    return base - v * amp;
  }

  // 능선 실루엣 하나 — 닫힌 다각형(아래는 캔버스 바닥까지)으로 lineTo, 그라디언트 파스텔로 채운다
  function drawRidge(
    ctx: CanvasRenderingContext2D, H: number, W: number,
    sec: number, scale: number, offset: number, base: number, amp: number, flow: number,
    topColor: string, bottomColor: string,
  ): void {
    const step = 2;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += step) {
      const xx = x > W ? W : x;
      ctx.lineTo(xx, ridgeY(xx, scale, offset, base, amp, sec, flow));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, H);
    g.addColorStop(0, topColor);
    g.addColorStop(1, bottomColor);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current, root = rootRef.current;
    if (!ctx || !root) return;
    const W = sizeRef.current.w, H = sizeRef.current.h;
    ctx.clearRect(0, 0, W, H);
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, tok("--sky-top"));
    sky.addColorStop(1, tok("--sky-bottom"));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawRidge(ctx, H, W, sec, FAR_SCALE, FAR_OFFSET, H * 0.50, H * 0.38, FAR_FLOW, tok("--far-top"), tok("--far-bottom"));
    drawRidge(ctx, H, W, sec, NEAR_SCALE, NEAR_OFFSET, H * 0.80, H * 0.56, NEAR_FLOW, tok("--near-top"), tok("--near-bottom"));
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function onSeedInput(event: InputEvt): void {
    const v = Math.max(1, Math.min(9999, Math.floor(Number(event.target.value)) || 1));
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
    if (!ctxRef.current) return;
    buildTables(Number(seedRef.current?.value) || 7);
    fit();
    window.addEventListener("resize", onResize);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 시드가 정한 능선 한 장만 그린다
      stillRef.current = true;
      paint(0);
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
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M144 52a20 20 0 1 1 20 20a20 20 0 0 1-20-20m49.44 55.92a8 8 0 0 0-13.77 0l-33 55.75l-21-35.67H50.35L8 200h240Z" opacity=".2"/><path d="M164 80a28 28 0 1 0-28-28a28 28 0 0 0 28 28m0-40a12 12 0 1 1-12 12a12 12 0 0 1 12-12m90.88 155.92l-54.56-92.08A15.87 15.87 0 0 0 186.55 96a15.85 15.85 0 0 0-13.76 7.84L146.63 148l-44.84-76.1a16 16 0 0 0-27.58 0L1.11 195.94A8 8 0 0 0 8 208h240a8 8 0 0 0 6.88-12.08M88 80l23.57 40H64.43ZM22 192l33-56h66l33 56Zm150.57 0l-16.66-28.28L186.55 112L234 192Z"/></g></svg>
          <span>시드를 바꾸면 능선이 처음부터 다시 태어납니다</span>
        </p>
        <div className={styles.field} ref={fieldRef}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>시드
            <input type="number" ref={seedRef} min={1} max={9999} step={1} defaultValue={7} aria-label="지형 시드" onChange={onSeedInput} />
          </label>
        </div>
      </div>
    </main>
  );
}
