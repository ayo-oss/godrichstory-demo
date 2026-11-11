// LorenzPoincareSectionSlice — vanilla 판(run/324/demo/07-lorenz-poincare-section-slice/index.html) 의 React 포트.
// RK4 로 긴 궤적을 사전 적분해 두고, z 가 기준값 27 을 건너는 순간만 선형 보간으로
// (x, y) 를 찍는다. 상승 통과는 얼음, 하강 통과는 복숭아 — 두 방향이 각 날개에 띠를 만든다.
// 점은 저해상도 히스토그램에 3x3 스플랏으로 누적해 감마 램프로 뿌린다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzPoincareSectionSlice.module.scss";

export type LorenzPoincareSectionSliceProps = {
  duration?: string;
  easing?: string;
  color?: string;
  dt?: number;     // RK4 걸음 — 작게 잡아 통과 순간을 정밀하게 잡는다
  steps?: number;  // 사전 적분 걸음 수 (총 70 시간단위)
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const DT     = 0.005;   // RK4 걸음
const STEPS  = 14000;   // 사전 적분 걸음 수 (총 70 시간단위)
const CYCLE  = 2.0;     // 리셋 주기(초) — 설정 초(2s)와 같다
const RES = 150;        // 단면 지도 해상도(정사각)
const REVEAL_END = 0.84;
const Z_PLANE = 27;     // 기준 단면 — z = 27

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Vec3 = [number, number, number];

const FIELD_LABEL = "푸앵카레 단면 실험판";
const META_LEFT = "z = 27 단면 · 양방향 통과 수집";
const META_RIGHT = "canvas · 단면 지도 · 주기 2초";
const HINT = "궤적이 기준 평면을 통과하는 순간의 좌표에만 점을 찍으면 날개마다 점 구름이 띠를 이룹니다";

const SIG = 10, RHO = 28, BETA = 8 / 3;

function deriv(x: number, y: number, z: number): Vec3 {
  return [SIG * (y - x), x * (RHO - z) - y, x * y - BETA * z];
}
function rk4(p: Vec3, DT: number): Vec3 {
  const k1 = deriv(p[0], p[1], p[2]);
  const k2 = deriv(p[0] + k1[0] * DT / 2, p[1] + k1[1] * DT / 2, p[2] + k1[2] * DT / 2);
  const k3 = deriv(p[0] + k2[0] * DT / 2, p[1] + k2[1] * DT / 2, p[2] + k2[2] * DT / 2);
  const k4 = deriv(p[0] + k3[0] * DT, p[1] + k3[1] * DT, p[2] + k3[2] * DT);
  return [
    p[0] + DT / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    p[1] + DT / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    p[2] + DT / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
  ];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

// 통과 하나를 3x3 가우시안 근사 스플랏으로 누적
const W9 = [0.30, 0.55, 0.30, 0.55, 1.0, 0.55, 0.30, 0.55, 0.30];

export default function LorenzPoincareSectionSlice({
  duration = "2s",
  easing = "ease-out",
  color = "#cfe3ff",
  dt = DT,
  steps = STEPS
}: LorenzPoincareSectionSliceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cuRef = useRef<RGB | null>(null);    // 상승 통과 — 얼음 파스텔
  const cdRef = useRef<RGB | null>(null);    // 하강 통과 — 복숭아 파스텔
  const panelRef = useRef<RGB | null>(null);
  const trajRef = useRef<{ xs: Float32Array; ys: Float32Array; zs: Float32Array } | null>(null);
  const crossRef = useRef<{ crX: number[]; crY: number[]; crUp: number[] } | null>(null);
  const histURef = useRef<Float32Array | null>(null);
  const histDRef = useRef<Float32Array | null>(null);
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
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

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    const ctx = ctxRef.current;
    if (!field || !cv || !ctx) return;
    const r = field.getBoundingClientRect();
    wRef.current = Math.round(r.width);
    hRef.current = Math.round(r.height);
    cv.width = wRef.current;
    cv.height = hRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  // 사전 적분 + 통과 목록 — 과도기 400걸음 버림
  function precompute(n: number, step: number): void {
    const xs = new Float32Array(n), ys = new Float32Array(n), zs = new Float32Array(n);
    let p: Vec3 = [0.6, 0.7, 21];
    for (let i = 0; i < 400; i++) p = rk4(p, step);
    for (let i = 0; i < n; i++) {
      xs[i] = p[0]; ys[i] = p[1]; zs[i] = p[2];
      p = rk4(p, step);
    }
    // 통과 목록 — z 가 27 을 건너는 순간의 보간 (x, y) 와 방향(1 상승 / 0 하강)
    const crX: number[] = [], crY: number[] = [], crUp: number[] = [];
    for (let i = 1; i < n; i++) {
      const za = zs[i - 1] - Z_PLANE, zb = zs[i] - Z_PLANE;
      if ((za < 0 && zb >= 0) || (za >= 0 && zb < 0)) {
        const t2 = za / (za - zb);
        crX.push(xs[i - 1] + (xs[i] - xs[i - 1]) * t2);
        crY.push(ys[i - 1] + (ys[i] - ys[i - 1]) * t2);
        crUp.push(zb > za ? 1 : 0);
      }
    }
    trajRef.current = { xs, ys, zs };
    crossRef.current = { crX, crY, crUp };
  }

  // 통과 하나를 3x3 가우시안 근사 스플랏으로 누적
  function splat(cx2: number, cy2: number, up: number): void {
    const histU = histURef.current;
    const histD = histDRef.current;
    if (!histU || !histD) return;
    const gx = (cx2 / 24 + 0.5) * (RES - 1);
    const gy = (1 - (cy2 + 28) / 56) * (RES - 1);
    const gx0 = Math.round(gx), gy0 = Math.round(gy);
    const dst = up ? histU : histD;
    for (let j = -1; j <= 1; j++) {
      for (let k2 = -1; k2 <= 1; k2++) {
        const ix = gx0 + k2, iy = gy0 + j;
        if (ix < 0 || ix >= RES || iy < 0 || iy >= RES) continue;
        const w = W9[(j + 1) * 3 + (k2 + 1)];
        dst[iy * RES + ix] += w;
      }
    }
  }

  function splatUpTo(count: number): void {
    const cross = crossRef.current;
    if (!cross) return;
    for (let i = 0; i < count; i++) splat(cross.crX[i], cross.crY[i], cross.crUp[i]);
  }

  function draw(phase: number): void {
    const ctx = ctxRef.current;
    const traj = trajRef.current;
    const histU = histURef.current;
    const histD = histDRef.current;
    const PANEL = panelRef.current;
    const CU = cuRef.current;
    const CD = cdRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !traj || !histU || !histD || !PANEL || !CU || !CD) return;
    const { xs, ys } = traj;
    const STEPSN = xs.length;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);

    const upto = Math.min(1, phase / REVEAL_END);
    const fade = phase > REVEAL_END ? Math.max(0, 1 - (phase - REVEAL_END) / (1 - REVEAL_END)) : 1;

    // 배경 — xy 투영 전체 궤적이 순차 공개되며 단면의 맥락을 깐다
    const s = Math.min(W / 50, H / 58);
    const n = Math.floor(upto * STEPSN);
    if (n > 2) {
      ctx.strokeStyle = rgba(CU, 0.09 * fade);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 + xs[0] * s, H / 2 - ys[0] * s);
      for (let i = 1; i < n; i++) ctx.lineTo(W / 2 + xs[i] * s, H / 2 - ys[i] * s);
      ctx.stroke();
    }

    // 단면 지도 — 두 방향 히스토그램을 감마 램프로 합성
    let maxU = 0, maxD = 0;
    for (let i = 0; i < histU.length; i++) {
      if (histU[i] > maxU) maxU = histU[i];
      if (histD[i] > maxD) maxD = histD[i];
    }
    if (maxU <= 0) maxU = 1;
    if (maxD <= 0) maxD = 1;
    const sideW = W * 0.44, sideH = H * 0.9;
    const cellW = sideW / RES, cellH = sideH / RES;
    ctx.save();
    ctx.translate((W - sideW) / 2, (H - sideH) / 2);
    for (let j = 0; j < RES; j++) {
      for (let k2 = 0; k2 < RES; k2++) {
        const su = Math.pow(histU[j * RES + k2] / maxU, 0.34);
        const sd = Math.pow(histD[j * RES + k2] / maxD, 0.34);
        const tot = su + sd;
        if (tot <= 0.003) continue;
        const col = mix(CU, CD, sd / tot);
        const alpha = Math.min(1, 0.12 + tot * 0.85) * fade;
        ctx.fillStyle = "rgba(" + (col[0] | 0) + "," + (col[1] | 0) + "," + (col[2] | 0) + "," + alpha + ")";
        ctx.fillRect(k2 * cellW, j * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
    ctx.restore();
  }

  let t0 = -1;
  let splatted = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const cross = crossRef.current;
    if (!cross) return;
    const phase = (((now - t0) / 1000) % CYCLE) / CYCLE;
    const want = Math.floor(Math.min(1, phase / REVEAL_END) * cross.crX.length);
    if (want !== splatted) {                  // 통과 수가 변할 때만 다시 스플랏
      histURef.current = new Float32Array(RES * RES);
      histDRef.current = new Float32Array(RES * RES);
      splatUpTo(want);
      splatted = want;
    }
    draw(phase);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    cuRef.current = tokRGB(root, "--lz-cu");
    cdRef.current = tokRGB(root, "--lz-cd");
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    histURef.current = new Float32Array(RES * RES);
    histDRef.current = new Float32Array(RES * RES);
    precompute(steps, dt);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.8);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      splatUpTo(crossRef.current ? crossRef.current.crX.length : 0);  // reduce — 다 찬 단면 지도 한 장
      draw(0.8);
      setStill(true);
    } else {
      t0 = -1;
      splatted = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, dt]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>{HINT}</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>{META_LEFT}</span>
          <span className={styles.metaDim}>{META_RIGHT}</span>
        </div>
      </div>
    </main>
  );
}
