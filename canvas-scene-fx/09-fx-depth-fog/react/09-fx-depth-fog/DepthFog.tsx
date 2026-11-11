// DepthFog — vanilla 판(run/077/demo/09-fx-depth-fog/index.html) 의 React 포트.
// 능선 실루엣 여섯 겹을 거리순으로 세우고 거리마다 안개 색을 지수로 섞는다(t = exp(-거리/밀도)).
// 움직임은 캔버스 rAF 루프가 전부 그리므로 @keyframes 가 없다 — props 는 CSS 변수로 내려간다.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./DepthFog.module.scss";

export type DepthFogProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };
// React 이벤트 제네릭이 없는 환경이라 필요한 것만 로컬로 선언한다
type RngEvt = { target: { value: string } };

const LAYERS = 6;
const STILL_T = 3;      // reduce 정지판을 찍는 시각(초) — 새가 하늘에 떠 있는 순간
const FOG_LABEL = "안개 밀도";
const BASE_FOG = "24";
const BIRDS = [
  { y: 0.15, speed: 0.11, phase: 0.1, size: 9 },
  { y: 0.23, speed: 0.07, phase: 0.62, size: 7 },
];

type Size = { w: number; h: number; dpr: number };
type RGB = [number, number, number];

// 시드 고정 난수와 능선 점렬(정규화 0..1) — 조절점 사이 코사인 보간, 양 끝이 이어진다
function rng(seed: number): () => number {
  return function (): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function ridgePts(seed: number, bumps: number): number[] {
  const rr = rng(seed);
  const cp: number[] = [];
  for (let i = 0; i < bumps; i++) cp.push(rr());
  cp.push(cp[0]);
  const pts: number[] = [];
  const n = bumps * 12;
  for (let k = 0; k <= n; k++) {
    const t = k / n * bumps;
    const i0 = Math.floor(t), f = t - i0;
    const s = (1 - Math.cos(f * Math.PI)) * 0.5;
    pts.push(cp[i0] + (cp[i0 + 1] - cp[i0]) * s);
  }
  return pts;
}
const RIDGE_DATA: number[][] = [];
const META: { base: number; amp: number; speed: number }[] = [];
for (let i = 0; i < LAYERS; i++) {
  RIDGE_DATA.push(ridgePts(31 + i * 17, 3 + i));   // 앞으로 올수록 봉우리가 촘촘해진다
  META.push({
    base: 0.40 + i * 0.082,   // 능선 기준선(정규) — 뒤가 높고 앞이 낮게 내려온다
    amp: 0.045 + i * 0.026,   // 진폭 — 앞으로 올수록 산이 크다
    speed: 4 + i * 6,         // 흐름 속도(px/초) — 앞이 빠르다(시차)
  });
}

// '#rrggbb' → [r, g, b]. 토큰 mix 값은 컴파일 타임에 hex 로 굳는다
function hex3(s: string): RGB {
  const m = /^#([0-9a-f]{6})$/i.exec(s);
  return m ? [parseInt(s.substr(1, 2), 16), parseInt(s.substr(3, 2), 16), parseInt(s.substr(5, 2), 16)] : [0, 0, 0];
}
function mix3(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function css3(c: RGB): string {
  return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")";
}

export default function DepthFog({
  duration = "2s",                            // vanilla $duration: $dur-loop
  easing = "cubic-bezier(.2, .8, .2, 1)",     // vanilla $easing: $ease-spring
  color = "#17141a",                          // vanilla $color: $subject-ink
}: DepthFogProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fogOutRef = useRef<HTMLElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 }) as Box<Size>;
  const pathsRef = useRef<Path2D[]>([]) as Box<Path2D[]>;
  const densityRef = useRef(2.4) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function fit(): void {
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!cv || !ctx || !cv.parentElement) return;
    const r = cv.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const s = sizeRef.current;
    s.w = r.width; s.h = r.height; s.dpr = dpr;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const paths: Path2D[] = [];
    for (let i = 0; i < LAYERS; i++) {
      const pts = RIDGE_DATA[i], m = META[i];
      const p = new Path2D();
      p.moveTo(-2, r.height + 2);
      for (let k = 0; k < pts.length; k++) {
        p.lineTo(k / (pts.length - 1) * r.width, r.height * (m.base - m.amp * pts[k]));
      }
      p.lineTo(r.width + 2, r.height + 2);
      p.closePath();
      paths.push(p);
    }
    pathsRef.current = paths;
  }

  // 새 두 마리 — 하늘을 가로지르는 작은 v 자. 날개각이 떨린다
  function birds(ctx: CanvasRenderingContext2D, sec: number): void {
    const s = sizeRef.current;
    const cssv = (n: string) => getComputedStyle(rootRef.current as HTMLDivElement).getPropertyValue(n).trim();
    ctx.strokeStyle = cssv("--bird");
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.8;
    for (const b of BIRDS) {
      const span = s.w + 80;
      const x = -40 + ((sec * b.speed * s.w + b.phase * span) % span);
      const y = s.h * (b.y + Math.sin(sec * 0.8 + b.phase * 6) * 0.02);
      const wing = 0.18 + (Math.sin(sec * 6.5 + b.phase * 9) * 0.5 + 0.5) * 0.62;
      const dy = Math.sin(wing) * b.size;
      const dx = Math.cos(wing) * b.size;
      ctx.lineWidth = Math.max(1, b.size * 0.14);
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.quadraticCurveTo(x - dx * 0.3, y - dy * 0.2, x, y);
      ctx.quadraticCurveTo(x + dx * 0.3, y - dy * 0.2, x + dx, y - dy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function paint(sec: number): void {
    const ctx = ctxRef.current;
    const s = sizeRef.current;
    if (!ctx || !s.w) return;
    const cssv = (n: string) => getComputedStyle(rootRef.current as HTMLDivElement).getPropertyValue(n).trim();
    const sky1c = hex3(cssv("--sky-1"));
    const ink = hex3(cssv("--ink"));
    // 하늘 — 위가 진하고 지평선으로 갈수록 옅어지는 세로 그라디언트
    const sky = ctx.createLinearGradient(0, 0, 0, s.h);
    sky.addColorStop(0, cssv("--sky-0"));
    sky.addColorStop(1, cssv("--sky-1"));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, s.w, s.h);
    // 옅은 해 — 거리 감각을 잡아 주는 반점 하나(빛줄기는 없다. 그건 08 의 소재다)
    const sun = ctx.createRadialGradient(s.w * 0.74, s.h * 0.2, 1, s.w * 0.74, s.h * 0.2, s.h * 0.3);
    sun.addColorStop(0, cssv("--sun-0"));
    sun.addColorStop(1, cssv("--sun-1"));
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, s.w, s.h);
    birds(ctx, sec);
    // 능선 — 뒤에서 앞으로. 거리마다 안개 색을 지수로 섞는다: t = exp(-거리/밀도)
    for (let i = 0; i < LAYERS; i++) {
      const d = LAYERS - i;                              // 거리 — 앞층이 1
      const t = Math.exp(-d / densityRef.current);       // 그 층이 남길 대비
      const off = (sec * META[i].speed) % s.w;
      ctx.fillStyle = css3(mix3(sky1c, ink, t));
      ctx.save();
      ctx.translate(-off, 0);
      ctx.fill(pathsRef.current[i]);
      ctx.translate(s.w, 0);
      ctx.fill(pathsRef.current[i]);
      ctx.restore();
    }
  }

  function frame(now: number): void {
    paint(now / 1000);
    rafRef.current = requestAnimationFrame(frame);
  }

  function setFog(val: string): void {
    densityRef.current = Number(val) / 10;
    if (fogOutRef.current) fogOutRef.current.textContent = "×" + densityRef.current.toFixed(1);
  }

  function onRange(e: RngEvt): void {
    setFog(e.target.value);
    if (reduced()) paint(STILL_T);
  }

  function onResize(): void {
    fit();
    if (reduced()) paint(STILL_T);
  }

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    ctxRef.current = cv.getContext("2d");
    if (!ctxRef.current) return;
    fit();
    setFog(BASE_FOG);
    if (reduced()) {
      // reduce — 루프를 시작하지 않고 여섯 층 깊이가 다 보이는 정적 한 장만 그린다
      rootRef.current?.classList.add("is-still");
      paint(STILL_T);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.root} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <svg className={styles.ico} viewBox="0 0 256 256" aria-hidden="true"><g fill="currentColor"><path d="M224 100a68 68 0 0 1-68 68H76a44 44 0 1 1 14.2-85.66v.11A68.06 68.06 0 0 1 224 100" opacity=".2"/><path d="M120 208H72a8 8 0 0 1 0-16h48a8 8 0 0 1 0 16m64-16h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16m-24 32h-56a8 8 0 0 0 0 16h56a8 8 0 0 0 0-16m72-124a76.08 76.08 0 0 1-76 76H76a52 52 0 0 1 0-104a53 53 0 0 1 8.92.76A76.08 76.08 0 0 1 232 100m-16 0a60.06 60.06 0 0 0-120-3.54a8 8 0 0 1-16-.92q.21-3.66.77-7.23A38 38 0 0 0 76 88a36 36 0 0 0 0 72h80a60.07 60.07 0 0 0 60-60"/></g></svg>
          <span>안개 밀도를 올리면 먼 능선이 하늘에 녹아 사라집니다</span>
        </p>
        <div className={styles.field}>
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <label className={styles.dial}>{FOG_LABEL}
            <input type="range" min="10" max="60" step="1" defaultValue={BASE_FOG} aria-label={FOG_LABEL} onChange={onRange}></input>
            <b className={styles.val} ref={fogOutRef}>×2.4</b>
          </label>
        </div>
      </div>
    </main>
  );
}
