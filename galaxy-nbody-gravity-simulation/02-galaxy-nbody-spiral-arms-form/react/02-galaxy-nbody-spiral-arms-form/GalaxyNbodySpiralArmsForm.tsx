// GalaxyNbodySpiralArmsForm — vanilla 판(run/322/demo/02-galaxy-nbody-spiral-arms-form/index.html) 의 React 포트.
// 정지 원반이 차등회전으로 팔을 자라게 하는 장면. 01 과 같은 전 쌍 O(N²) 뉴턴 중력이되
// 적분기를 leapfrog(개구리뛰기)로 바꾼다: 가속도를 절반 스텝 앞뒤로 대칭 계산해
// 속도·위치를 번갈아 밀면 에너지가 오래 보존되어 원반이 몇 바퀴을 돌아도 부풀지 않는다.
// 중심 질량(그리지 않는 핵)을 크게 두고 별 상호 중력을 더하면 안쪽이 빠르게 도는
// 차등회전이 초기 밀도 요동을 감아 올려 나선 팔이 저절로 선명해진다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodySpiralArmsForm.module.scss";

export type GalaxyNbodySpiralArmsFormProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;   // 원반 별 수
  method?: "leapfrog" | "euler";  // 적분기 — 'euler' 로 바꾸면 변형 "적분기: 오일러"
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "나선 팔 형성 실험판";

// G·질량은 캔버스 픽셀 단위의 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 60.0, SOFT2 = 36;
const DT = 1 / 60;
const MHALO = 6200;   // 중심 질량(핵+헤일로 합) — 그리지 않는다. 별 상호중력과 함께 가속도에 더해진다

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyNbodySpiralArmsForm({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 320,
  method = "leapfrog"
}: GalaxyNbodySpiralArmsFormProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const methodRef = useRef(method) as Box<string>;
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

  type SimM = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[]; MASS: number[] };
  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], VX: [] as number[], VY: [] as number[], MASS: [] as number[] }) as Box<SimM>;
  const AXRef = useRef<number[]>([]) as Box<number[]>;
  const AYRef = useRef<number[]>([]) as Box<number[]>;
  const aReadyRef = useRef(false);
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

  // 가속도 합산 — 중심 질량 인력 + 별끼리의 전 쌍 O(N²). AX/AY 는 재사용 버퍼(가비지 최소화)
  function accel(): void {
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    const N = sim.N;
    const W = wRef.current, H = hRef.current;
    let i: number, j: number, dx: number, dy: number, d2: number, inv: number, f: number;
    for (i = 0; i < N; i++) { AX[i] = 0; AY[i] = 0; }
    // 중심 질량 — 원점이 아니라 원반 중심을 향한다(원반이 화면 중앙에 있으므로 W/2, H/2)
    const cx = W * 0.5, cy = H * 0.5;
    for (i = 0; i < N; i++) {
      dx = cx - sim.X[i]; dy = cy - sim.Y[i];
      d2 = dx * dx + dy * dy + SOFT2;
      inv = 1 / Math.sqrt(d2);
      f = G * MHALO * inv * inv * inv;
      AX[i] += dx * f; AY[i] += dy * f;
    }
    // 별 상호 중력 — 대칭이라 쌍당 한 번 계산해 양쪽에 반영
    for (i = 0; i < N; i++) {
      for (j = i + 1; j < N; j++) {
        dx = sim.X[j] - sim.X[i]; dy = sim.Y[j] - sim.Y[i];
        d2 = dx * dx + dy * dy + SOFT2;
        inv = 1 / Math.sqrt(d2);
        f = G * sim.MASS[i] * sim.MASS[j] * inv * inv * inv;
        AX[i] += dx * f; AY[i] += dy * f;
        AX[j] -= dx * f; AY[j] -= dy * f;
      }
    }
  }

  function stepEuler(): void {
    // semi-implicit Euler(변형 비교용 — 기본은 leapfrog)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    accel();
    for (let i = 0; i < sim.N; i++) {
      sim.VX[i] += AX[i] * DT; sim.VY[i] += AY[i] * DT;
      sim.X[i] += sim.VX[i] * DT; sim.Y[i] += sim.VY[i] * DT;
    }
  }

  function stepLeap(): void {
    // leapfrog(속도_verlet) — a(t) 를 재사용해 절반씩 대칭으로 밀어 에너지를 보존한다
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    if (!aReadyRef.current) { accel(); aReadyRef.current = true; }
    const h = DT * 0.5;
    for (let i = 0; i < sim.N; i++) {
      sim.VX[i] += AX[i] * h; sim.VY[i] += AY[i] * h;   // v(t+h/2) = v(t) + a(t)·h/2
      sim.X[i] += sim.VX[i] * DT; sim.Y[i] += sim.VY[i] * DT;  // x(t+h) = x(t) + v(t+h/2)·h
    }
    accel();                                            // a(t+h)
    for (let j = 0; j < sim.N; j++) {
      sim.VX[j] += AX[j] * h; sim.VY[j] += AY[j] * h;   // v(t+h) = v(t+h/2) + a(t+h)·h/2
    }
  }

  function step(): void {
    if (methodRef.current === "leapfrog") stepLeap();
    else stepEuler();
  }

  function seed(): void {
    // 정지 원반 — 반지름별 원궤도 속도(안쪽이 빠르다 = 차등회전)에 초기 밀도 요동(이빨)을 심는다.
    // 요동은 각도 방향 사인파 — 시간이 흐르면 차등회전이 이를 감아 나선으로 만든다.
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.MASS = []; sim.N = 0;
    const rnd = mulberry32(11);
    const W = wRef.current, H = hRef.current;
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.44;
    for (let i = 0; i < nstarsRef.current; i++) {
      const far = rnd() < 0.50;                             // 바깥 별 — 원반 밖 넓은 궤도(외곽 궤적 누적)
      const r = far
        ? R * (0.42 + 2.00 * rnd())
        : 0.12 * R + R * 0.82 * Math.sqrt(rnd());           // 코어 밀집 + 바깥 얇게
      const a = rnd() * Math.PI * 2 + 0.14 * Math.sin(r * 0.16);  // 각도에 반지름 결합 사인 요동
      const v = Math.sqrt(G * MHALO / Math.max(r, 8)) * (far ? 0.82 : 1.0);  // 원궤도 속도 — r 이 작을수록 크다
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r * 0.90);              // 살짝 눌러 타원 원반(시각적 깊이)
      sim.VX.push(-Math.sin(a) * v + (rnd() - 0.5) * 1.5);
      sim.VY.push(Math.cos(a) * v * 0.90 + (rnd() - 0.5) * 1.5);
      sim.MASS.push(0.5 + rnd() * 0.8);
      sim.N++;
    }
  }

  function decay(): void {
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.015)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stamp(): void {
    // 잔상 — 이전 프레임과 이어 그리면 궤도 누적으로 팔이 선명해진다
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let i = 0; i < sim.N; i++) {
        const r = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
        const c = r < Math.min(W, H) * 0.18 ? col.hot : col.glow;
        chainCtx.strokeStyle = rgba(c, 0.28);
        chainCtx.lineWidth = 1.8;
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
    // 배경 별밭(정적·시드 고정) — 깊이감
    ctx.fillStyle = rgb(col.ink);
    ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(21);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H;
      ctx.globalAlpha = 0.10 + rnd() * 0.20;
      ctx.fillRect(bx, by, 1.2, 1.2);               // fillRect 점 — 원반이라 arc 점보다 빠르다
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 별 — 바깥 별은 파스텔 페리윙클 사각 점(밀도가 눈에 잘 들어온다), 코어는 파스텔 앰버
    const R = Math.min(W, H);
    for (let i = 0; i < sim.N; i++) {
      const r = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
      const c = r < R * 0.16 ? col.hot : col.glow;
      const sz = r < R * 0.16 ? 3.0 : 2.6;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = rgba(c, 0.16);                // 글로우 겉층
      ctx.fillRect(sim.X[i] - sz, sim.Y[i] - sz, sz * 2, sz * 2);
      ctx.fillStyle = rgba(c, 0.95);                // 코어
      ctx.fillRect(sim.X[i] - sz * 0.40, sim.Y[i] - sz * 0.40, sz * 0.80, sz * 0.80);
    }
    ctx.globalAlpha = 1;
    // 중심 질량 위치 표식 — 그리지 않는 핵의 위치(원반 중심)를 앰버 점으로만 알린다
    ctx.fillStyle = rgba(col.hot, 0.9);
    ctx.fillRect(W * 0.5 - 1.8, H * 0.5 - 1.8, 3.6, 3.6);
  }

  function stillFrame(): void {
    // reduce — 팔이 어느 정도 자란 장면까지 적분한 뒤 한 장을 고정한다
    for (let s = 0; s < 240; s++) { step(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 3.0;         // 3초 루프 — 팔이 자라는 초반을 반복 보여준다
    const target = Math.floor(loop / DT);
    while (simStepsRef.current < target) { step(); simStepsRef.current++; stamp(); }
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
    methodRef.current = method;
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
    aReadyRef.current = false;
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
  }, [nstars, method]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>안쪽이 빠르게 도는 차등회전이 초기 밀도 요동을 늘려, 정지 원반이 적분만으로 나선팔을 자라게 합니다</span>
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
          <span className={styles.meta}>별 320개 · 레인포드 적분</span>
          <span className={styles.metaDim}>canvas · leapfrog · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
