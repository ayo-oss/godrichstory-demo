// GalaxyNbodyTidalTail — vanilla 판(run/322/demo/06-galaxy-nbody-tidal-tail/index.html) 의 React 포트.
// 조석 꼬리 클로즈업 — 수천 별 중 딱 한 별의 궤적만 굵게 남기는 장면.
// 계산은 01 과 같은 전 쌍 O(N²) 뉴턴 중력 + leapfrog(근사 아님).
// 다른 점은 렌더 뿐이다:
//  - 다른 별은 흐린 점 + 짧은 잔상(집단의 흐름만 보인다)
//  - 추적 별(TRACK 인덱스, 원반 바깥쪽에 심는다)은 굵은 앰버 궤적을
//    별도 트레일 버퍼(좌표 180개 링)에 쌓아 lineTo 로 이어 그린다 —
//    두 은하 중심 사이를 왕복(Lissajous)하다 조석 킥에 던져지는 과정이 한 줄로 드러난다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyTidalTail.module.scss";

export type GalaxyNbodyTidalTailProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 두 은하 합계 별 수
  trailn?: number;  // 추적 별 궤적 길이(프레임) — 변형 "궤적 길이"가 180→360으로
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Sim2D = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[] };

const FIELD_LABEL = "조석 꼬리 클로즈업 실험판";

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

export default function GalaxyNbodyTidalTail({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 340,
  trailn = 180
}: GalaxyNbodyTidalTailProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const trailnRef = useRef(trailn) as Box<number>;
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
  const trackRef = useRef(-1) as Box<number>;        // 추적 별 인덱스 — seed() 에서 원반 가장자리로 정한다
  const trailXRef = useRef<number[]>([]) as Box<number[]>;
  const trailYRef = useRef<number[]>([]) as Box<number[]>;

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
    const sim = simRef.current;
    const M = R * R * 0.90;
    const start = sim.N;
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
    // 추적 별 — 첫 원반 바깥쪽 마지막 별(조석 꼬리가 먼저 잡히는 위치)
    if (trackRef.current < 0 && start === 0) trackRef.current = sim.N - 1;
  }

  function seed(): void {
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.N = 0;
    aReadyRef.current = false;
    trackRef.current = -1;
    trailXRef.current = []; trailYRef.current = [];
    const rnd = mulberry32(13);
    const half = nstarsRef.current >> 1;
    const W = wRef.current, H = hRef.current;
    const R = Math.min(W, H) * 0.46;
    const sc = R;
    placeDisk(W * 0.26, H * 0.30, R, half, 0, 0.62, -0.42, 1.0, rnd, sc);
    placeDisk(W * 0.74, H * 0.70, R, nstarsRef.current - half, Math.PI, -0.62, 0.42, 0.85, rnd, sc);
  }

  function decay(): void {
    // 집단 잔상은 빨리 지운다(궤적이 아니라 흐름만 남긴다) — 추적 궤적은 trail 버퍼가 기억
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.028)";
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
        if (i === trackRef.current) continue;        // 추적 별은 여기 찍지 않는다(굵은 궤적이 대신한다)
        chainCtx.strokeStyle = rgba(i < (sim.N >> 1) ? col.glow : col.tail, 0.26);
        chainCtx.lineWidth = 1.6;
        chainCtx.beginPath();
        chainCtx.moveTo(prev[0][i], prev[1][i]);
        chainCtx.lineTo(sim.X[i], sim.Y[i]);
        chainCtx.stroke();
      }
    }
    if (!prev) prevRef.current = [sim.X.slice(), sim.Y.slice()];
    else { prev[0] = sim.X.slice(); prev[1] = sim.Y.slice(); }
    // 추적 궤적 링 버퍼 — 오래된 좌표는 밀려난다
    trailXRef.current.push(sim.X[trackRef.current]);
    trailYRef.current.push(sim.Y[trackRef.current]);
    if (trailXRef.current.length > trailnRef.current) { trailXRef.current.shift(); trailYRef.current.shift(); }
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
    const rnd = mulberry32(14);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.12 + rnd() * 0.22;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 추적 궤적 — 굵은 앰버 라인. 오래된 세그먼트일수록 옅게(페이드)
    const trailX = trailXRef.current, trailY = trailYRef.current;
    const tn = trailX.length;
    if (tn > 1) {
      for (let s = 1; s < tn; s++) {
        const age = s / tn;                    // 0 오래됨 → 1 최신
        ctx.strokeStyle = rgba(col.hot, 0.10 + age * 0.75);
        ctx.lineWidth = 0.8 + age * 1.9;
        ctx.beginPath();
        ctx.moveTo(trailX[s - 1], trailY[s - 1]);
        ctx.lineTo(trailX[s], trailY[s]);
        ctx.stroke();
      }
    }
    // 별 — 집단은 흐린 점, 추적 별은 큰 앰버 글로우 + 코어
    const trk = trackRef.current;
    for (let i = 0; i < sim.N; i++) {
      if (i === trk) continue;
      const c = i < (sim.N >> 1) ? col.glow : col.tail;
      ctx.fillStyle = rgba(c, 0.11);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 3.0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.58);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba(col.hot, 0.16);
    ctx.beginPath(); ctx.arc(sim.X[trk], sim.Y[trk], 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col.hot, 0.55);
    ctx.beginPath(); ctx.arc(sim.X[trk], sim.Y[trk], 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgba(col.hot, 1.0);
    ctx.beginPath(); ctx.arc(sim.X[trk], sim.Y[trk], 1.6, 0, Math.PI * 2); ctx.fill();
    // 은하 B 코어 표식
    ctx.fillStyle = rgba(col.glow, 0.85);
    ctx.beginPath(); ctx.arc(sim.X[sim.N >> 1], sim.Y[sim.N >> 1], 2.0, 0, Math.PI * 2); ctx.fill();
  }

  function stillFrame(): void {
    // reduce — 킥 직후까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 170; s++) { stepLeap(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 3.0;        // 3초 루프 — 스침 → 왕복 → 킥 순간 반복
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
    trailnRef.current = trailn;
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
  }, [nstars, trailn]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>수천 별 중 한 별만 궤적을 남기면, 꼬리가 만들어지는 순간 그 별이 두 중심 사이를 왕복하다 던져집니다</span>
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
          <span className={styles.meta}>별 340개 · 추적 1개 궤적</span>
          <span className={styles.metaDim}>canvas · one-star trail · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
