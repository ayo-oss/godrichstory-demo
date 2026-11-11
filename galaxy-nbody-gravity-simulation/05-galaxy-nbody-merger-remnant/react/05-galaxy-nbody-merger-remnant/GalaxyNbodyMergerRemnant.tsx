// GalaxyNbodyMergerRemnant — vanilla 판(run/322/demo/05-galaxy-nbody-merger-remnant/index.html) 의 React 포트.
// 합체 잔해 타원 은하 — 첫 스침을 지난 시점부터 시간을 흐르게 두는 장면.
// 시작은 두 은하가 이미 한 번 스쳐 꼬리가 늘어선 상태(두 번째 스침 직전):
// 시드에서 첫 스침을 미리 적분해 만든다(두 원반을 가깝게 놓고 몇백 스텝 = 첫 스침).
// 이후 화면의 시간이 흐르면 궤도 방향이 뒤섞이고(virial 화) 나선팔 구조가 흍어져
// 특징 없는 타원체가 남는다 — 관측되는 타원 은하가 합체 잔해라는 설명의 재현.
// 계산은 01 과 같은 전 쌍 O(N²) 뉴턴 중력 + leapfrog 적분(근사 아님).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyMergerRemnant.module.scss";

export type GalaxyNbodyMergerRemnantProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 두 은하 합계 별 수
  prepass?: number; // 시작 전 미리 흘려 둘 스텝(첫 스침+꼬리 형성) — 변형 "시작 시점"
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Sim2D = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[] };

const FIELD_LABEL = "합체 잔해 실험판";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 140.0, SOFT2 = 16;
const DT = 1 / 60;

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyNbodyMergerRemnant({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 320,
  prepass = 420
}: GalaxyNbodyMergerRemnantProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const prepassRef = useRef(prepass) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
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

  function rgba(c: RGB, a: number): string {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }

  function rgb(c: RGB): string {
    return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  }

  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], VX: [] as number[], VY: [] as number[] }) as Box<Sim2D>;
  const AXRef = useRef<number[]>([]) as Box<number[]>;
  const AYRef = useRef<number[]>([]) as Box<number[]>;
  const aReadyRef = useRef(false) as Box<boolean>;
  const prevRef = useRef<[number[], number[]] | null>(null);
  const simStepsRef = useRef(0) as Box<number>;

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const r = field.getBoundingClientRect();
    const W = Math.round(r.width), H = Math.round(r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    wRef.current = W; hRef.current = H; dprRef.current = dpr;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = "100%"; cv.style.height = "100%";
    ctxRef.current = cv.getContext("2d");
    const chainCv = document.createElement("canvas");
    chainCv.width = W * dpr; chainCv.height = H * dpr;
    const chainCtx = chainCv.getContext("2d");
    if (chainCtx) chainCtx.scale(dpr, dpr);
    chainCvRef.current = chainCv;
    chainCtxRef.current = chainCtx;
  }

  function accel(): void {
    // 전 쌍 O(N²) 뉴턴 중력 — a_i = Σ G·(x_j - x_i)/(|d|²+ε²)^1.5 (근사 아님)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    const N = sim.N;
    let i: number, j: number, dx: number, dy: number, d2: number, inv: number, f: number;
    for (i = 0; i < N; i++) { AX[i] = 0; AY[i] = 0; }
    for (i = 0; i < N; i++) {
      for (j = i + 1; j < N; j++) {
        dx = sim.X[j] - sim.X[i]; dy = sim.Y[j] - sim.Y[i];
        d2 = dx * dx + dy * dy + SOFT2;
        inv = 1 / Math.sqrt(d2);
        f = G * inv * inv * inv;
        AX[i] += dx * f; AY[i] += dy * f;
        AX[j] -= dx * f; AY[j] -= dy * f;
      }
    }
  }

  function stepLeap(): void {
    // leapfrog — 절반 스텝 대칭 킥으로 에너지를 오래 보존(장면이 몇 초 흐러도 부풀지 않는다)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    if (!aReadyRef.current) { accel(); aReadyRef.current = true; }
    const h = DT * 0.5;
    for (let i = 0; i < sim.N; i++) {
      sim.VX[i] += AX[i] * h; sim.VY[i] += AY[i] * h;
      sim.X[i] += sim.VX[i] * DT; sim.Y[i] += sim.VY[i] * DT;
    }
    accel();
    for (let j = 0; j < sim.N; j++) {
      sim.VX[j] += AX[j] * h; sim.VY[j] += AY[j] * h;
    }
  }

  function placeDisk(cx: number, cy: number, R: number, count: number, phase: number, dvx: number, dvy: number, dir: number, rnd: () => number, sc: number): void {
    // 원반 — r² 균등 면밀도, 원궤도 속도(01 과 동일 결정론 시더)
    const sim = simRef.current;
    const M = R * R * 0.90;
    for (let i = 0; i < count; i++) {
      const r = R * Math.sqrt(rnd());
      const a = phase + (i / count) * Math.PI * 2 + rnd() * 0.5;
      const v = Math.sqrt(M / Math.max(r, 6)) * dir;
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r);
      sim.VX.push(dvx * sc * 0.30 + -Math.sin(a) * v + (rnd() - 0.5) * 2);
      sim.VY.push(dvy * sc * 0.30 + Math.cos(a) * v + (rnd() - 0.5) * 2);
      sim.N++;
    }
  }

  function seed(): void {
    // 두 원반을 첫 스침 직전 거리(가깝게)에 놓고 PREPASS 스텝 미리 적분 —
    // 화면의 t=0 은 이미 한 번 스치고 꼬리가 늘어선 두 번째 스침 직전 상태다
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.N = 0;
    aReadyRef.current = false;
    const rnd = mulberry32(9);
    const half = nstarsRef.current >> 1;
    const W = wRef.current, H = hRef.current;
    const R = Math.min(W, H) * 0.44;
    const sc = R;
    placeDisk(W * 0.36, H * 0.34, R, half, 0, 0.62, -0.42, 1.0, rnd, sc);
    placeDisk(W * 0.64, H * 0.66, R, nstarsRef.current - half, Math.PI, -0.62, 0.42, 0.85, rnd, sc);
    for (let s = 0; s < prepassRef.current; s++) stepLeap();
  }

  function decay(): void {
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.012)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stamp(): void {
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let i = 0; i < sim.N; i++) {
        chainCtx.strokeStyle = rgba(i < (sim.N >> 1) ? col.glow : col.tail, 0.30);
        chainCtx.lineWidth = 1.9;
        chainCtx.beginPath();
        chainCtx.moveTo(prev[0][i], prev[1][i]);
        chainCtx.lineTo(sim.X[i], sim.Y[i]);
        chainCtx.stroke();
      }
    }
    if (!prev) prevRef.current = [sim.X.slice(), sim.Y.slice()];
    else { prev[0] = sim.X.slice(); prev[1] = sim.Y.slice(); }
  }

  function draw(): void {
    const ctx = ctxRef.current;
    const chainCv = chainCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const sim = simRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !chainCv || !col) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = rgb(col.ink);
    ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(10);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.12 + rnd() * 0.22;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 별 — 타원체 잔해 중심은 앰버 코어. ellipse 글로우를 겹쳐 은하 전체 윤곽을 암시한다
    let cx = 0, cy = 0;
    for (let i = 0; i < sim.N; i++) { cx += sim.X[i]; cy += sim.Y[i]; }
    cx /= sim.N; cy /= sim.N;
    let sx = 0, sy = 0;
    for (let i = 0; i < sim.N; i++) { sx += (sim.X[i] - cx) * (sim.X[i] - cx); sy += (sim.Y[i] - cy) * (sim.Y[i] - cy); }
    const rx = Math.sqrt(sx / sim.N) * 1.9, ry = Math.sqrt(sy / sim.N) * 1.9;
    ctx.fillStyle = rgba(col.hot, 0.055);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col.hot, 0.05);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    // 별 점 — 은하 A 페리윙클 · 은하 B 핑크(합쳐지며 섞인다)
    for (let i = 0; i < sim.N; i++) {
      const c = i < (sim.N >> 1) ? col.glow : col.tail;
      const d = Math.hypot(sim.X[i] - cx, sim.Y[i] - cy);
      const near = Math.max(0, 1 - d / (Math.min(W, H) * 0.70));
      ctx.fillStyle = rgba(c, 0.10 + near * 0.10);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 3.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.55 + near * 0.45);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 1.7 + near * 1.0, 0, Math.PI * 2); ctx.fill();
    }
    // 중심부 — 앰버 핵 점(무게중심)
    ctx.fillStyle = rgba(col.hot, 0.95);
    ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, Math.PI * 2); ctx.fill();
  }

  function stillFrame(): void {
    // reduce — 궤도가 뒤섞여 타원체가 잡히는 장면까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 300; s++) { stepLeap(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 4.0;        // 4초 루프 — 두 번째 스침 → 궤도 뒤섞임 → 타원체
    const target = Math.floor(loop / DT);
    while (simStepsRef.current < target) { stepLeap(); simStepsRef.current++; stamp(); }
    if (target < simStepsRef.current - 3) {
      seed(); simStepsRef.current = 0; prevRef.current = null;
      const chainCtx = chainCtxRef.current;
      if (chainCtx) chainCtx.clearRect(0, 0, wRef.current, hRef.current);
    }
    decay();
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nstarsRef.current = nstars;
    prepassRef.current = prepass;
    colRef.current = {
      ink: tokRGB(root, "--gx-ink"),
      glow: tokRGB(root, "--gx-glow"),
      hot: tokRGB(root, "--gx-hot"),
      tail: tokRGB(root, "--gx-tail"),
    };
    fit();
    seed();
    simStepsRef.current = 0;
    prevRef.current = null;
    function onResize(): void {
      fit(); seed(); simStepsRef.current = 0; prevRef.current = null; aReadyRef.current = false;
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nstars, prepass]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>충돌이 지나도 시간을 계속 흐르게 두면 나선팔이 흩어지고 궤도 방향이 뒤섞여 특징 없는 타원체가 남습니다</span>
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
          <span className={styles.meta}>두 번째 스침부터 시작 · 별 320개</span>
          <span className={styles.metaDim}>canvas · virial mix · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
