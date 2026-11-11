// GalaxyNbodyGalaxyCollide — vanilla 판(run/322/demo/01-galaxy-nbody-galaxy-collide/index.html) 의 React 포트.
// 두 은하의 별 각각에 매 프레임 뉴턴 중력을 더해 속도를 갱신하면, 스치는 순간 바깥 별이
// 뿜겨 나가는 조석 꼬리가 저절로 생긴다. 별마다 (x, y, vx, vy) 를 두고 매 프레임 모든 쌍의
// 중력 가속도를 더한다(전 쌍 O(N²) — 근사 아님. N=340 이라 57,630 쌍/프레임).
// 적분은 semi-implicit Euler(속도 갱신 뒤 위치 갱신) — 2초 루프 안에서 안정하다.
// 궤적은 투명 누적 캔버스에 찍힌 뒤 destination-out 로 조금씩 지워진다(조성 꼬리가 궤도 누적으로 보인다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyGalaxyCollide.module.scss";

export type GalaxyNbodyGalaxyCollideProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 두 은하 합계 별 수 — 변형 "별 개수"가 340→120으로
};

// ── 변형 상수(기본값) — vanilla 판과 동일. 스침 거리 SKIP 은 변형 제작용 표식(기본 장면 미사용) ──
const SKIP = 0.60;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "두 은하 충돌 실험판";

// G·질량은 캔버스 픽셀에 맞춘 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 140.0, SOFT2 = 16;   // softening ε²=16 — 근접 발산 방지(뉴턴 중력의 숫자 안정 장치)
const DT = 1 / 60;

// 결정론 시더 — 시드 고정이라 렌더마다 같은 장면이 나온다
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyNbodyGalaxyCollide({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 340
}: GalaxyNbodyGalaxyCollideProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
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

  // 별 상태 — 짝수 인덱스 x/y·홀수 vx/vy 쌍 배열(가독성 우선 — vanilla 판과 동일 구조)
  type Sim2D = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[] };
  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], VX: [] as number[], VY: [] as number[] }) as Box<Sim2D>;
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

  // cx,cy 중심 원반. dvx,dvy 은하 자신의 이동 속도(원반 반지름 R 배율). dir 공전 방향(+1 시계반대).
  function placeDisk(cx: number, cy: number, R: number, count: number, phase: number, dvx: number, dvy: number, dir: number, rnd: () => number, sc: number): void {
    const sim = simRef.current;
    // 중심 질량 M — 원반 가장자리(r=R)에서 원궤도 속도 v=sqrt(M/R) 가 나오게 잡는다
    const M = R * R * 0.90;
    for (let i = 0; i < count; i++) {
      const r = R * Math.sqrt(rnd());           // 면밀도 균일 — r² 균등
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
    // 두 원반 은하를 좌우 대각으로 놓고 서로를 향해 살짝 비스듬히 움직이게 한다.
    // 원반 별: 반지름 r 에 비례하는 원궤도 속도 + 작은 랜덤 흔들림(시드 고정 — 결정론 렌더).
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.N = 0;
    const rnd = mulberry32(7);
    const half = nstarsRef.current >> 1;
    const W = wRef.current, H = hRef.current;
    const R = Math.min(W, H) * 0.40;             // 원반 반지름 — 화면 절반을 쓴다(누적면적)
    const sc = R;
    placeDisk(W * 0.30, H * 0.34, R, half, 0, 0.62, -0.42, 1.0, rnd, sc);      // 은하 A — 오른쪽 위로
    placeDisk(W * 0.70, H * 0.66, R, nstarsRef.current - half, Math.PI, -0.62, 0.42, 0.85, rnd, sc); // 은하 B — 왼쪽 아래로
  }

  function step(): void {
    // 전 쌍 중력 — a_i = Σ_j G·(x_j - x_i)/(|d|²+ε²)^1.5. 대칭이라 쌍당 한 번 계산해 양쪽에 반영
    const sim = simRef.current;
    const N = sim.N;
    const AX = new Array<number>(N), AY = new Array<number>(N);
    for (let i = 0; i < N; i++) { AX[i] = 0; AY[i] = 0; }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = sim.X[j] - sim.X[i], dy = sim.Y[j] - sim.Y[i];
        const d2 = dx * dx + dy * dy + SOFT2;
        const inv = 1 / Math.sqrt(d2);
        const f = G * inv * inv * inv;          // f = G / d³ — dx·f 가 가속도 성분
        AX[i] += dx * f; AY[i] += dy * f;
        AX[j] -= dx * f; AY[j] -= dy * f;
      }
    }
    for (let i = 0; i < N; i++) {
      sim.VX[i] += AX[i] * DT; sim.VY[i] += AY[i] * DT;
      sim.X[i] += sim.VX[i] * DT; sim.Y[i] += sim.VY[i] * DT;
    }
  }

  function stamp(): void {
    // 별을 잔상 캔버스에 1px 점으로 찍는다 — 이전 프레임과 이어 그리면 궤도 선이 된다
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let i = 0; i < sim.N; i++) {
        chainCtx.strokeStyle = rgba(i < (sim.N >> 1) ? col.glow : col.tail, 0.32);
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

  function decay(): void {
    // 잔상 감쇠 — 궤적 캔버스를 매 프레임 조금씩 지운다(조석 꼬리가 궤도 누적으로 보이게)
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.016)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    // 배경 — 관측창 바닥색으로 매 프레임 지운다(별이 아니라 잔상 캔버스가 궤적을 기억)
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    // 배경 별밭(정적) — 깊이감. 시드 고정이라 렌더마다 같다
    const rnd = mulberry32(99);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.12 + rnd() * 0.22;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 별 — 은하 A 파스텔 페리윙클 · 은하 B 파스텔 핑크. 코어 근처 별은 밝게
    for (let i = 0; i < sim.N; i++) {
      const c = i < (sim.N >> 1) ? col.glow : col.tail;
      const d = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
      const near = Math.max(0, 1 - d / (Math.min(W, H) * 0.72));
      // 글로우 원(반지름 3.8) + 코어 점(반지름 1.7) 두 겹 — 앰비언트 글로우로 면적 확보
      ctx.fillStyle = rgba(c, 0.10 + near * 0.10);
      ctx.beginPath();
      ctx.arc(sim.X[i], sim.Y[i], 3.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.55 + near * 0.45);
      ctx.beginPath();
      ctx.arc(sim.X[i], sim.Y[i], 1.7 + near * 1.0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 은하 B 코어 표식 — 앰버 점(중심 별이 아니라 코어 위치 추적 마커)
    ctx.fillStyle = rgba(col.hot, 0.9);
    ctx.beginPath(); ctx.arc(sim.X[sim.N >> 1], sim.Y[sim.N >> 1], 2.2, 0, Math.PI * 2); ctx.fill();
  }

  function stillFrame(): void {
    // reduce — 루프 중반(꼬리가 가장 그럴듯한) 장면까지 시뮬레이션한 뒤 한 장을 고정한다
    for (let s = 0; s < 150; s++) { step(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    // 2초 루프 — 설정 초(2s)의 약수 주기로 시뮬을 되감는다(결정론 렌더·무한 반복)
    const loop = ((now - t0) / 1000) % 2.0;
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
      fit(); seed(); simStepsRef.current = 0; prevRef.current = null;
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
  }, [nstars]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>두 은하의 별 각각에 매 프레임 뉴턴 중력을 더해 속도를 갱신하면, 스치는 순간 바깥 별이 뿜겨 나가는 조석 꼬리가 저절로 생깁니다</span>
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
          <span className={styles.meta}>별 340개 · O(N²) 전 쌍 계산</span>
          <span className={styles.metaDim}>canvas · Newton gravity · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
