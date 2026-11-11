// GalaxyNbodyClusterOrbit — vanilla 판(run/322/demo/03-galaxy-nbody-cluster-orbit/index.html) 의 React 포트.
// 구상 성단 공전 — 원반이 아닌 구면 분포가 어떻게 도는지 보는 장면.
// 별 280개를 3차원 구(시선 방향 z 를 원근 스케일로 투영)로 흩뿌리고 전 쌍 O(N²) 중력을 적분한다.
// 은하 원반(02)과 달리 각도가 제각각이라 차등회전이 나선을 만들지 못하고,
// 별 각각은 매 프레임 다시 계산한 무게중심(com) 주위를 제각각의 궤도면으로 돈다.
// z 투영은 원근(가까운 별 크게)뿐 아니라 계산도 3차원으로 한다 — 화면은 그 투영일 뿐.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyClusterOrbit.module.scss";

export type GalaxyNbodyClusterOrbitProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 성단 별 수
  spin?: number;    // 초기 집단 회전(전체 궤도면 기울기 스케일)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];

const FIELD_LABEL = "구상 성단 공전 실험판";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 26.0, SOFT2 = 60;
const DT = 1 / 60;
const FOCAL = 420;    // 투영 초점거리 — z 깊이에 비례해 화면 좌표를 확대/축소

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyNbodyClusterOrbit({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 280,
  spin = 0.55
}: GalaxyNbodyClusterOrbitProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const spinRef = useRef(spin) as Box<number>;
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

  // 3차원 상태 — 화면은 (x, y) 투영. z 는 원근 스케일에만 쓰지 않고 계산에 그대로 들어간다
  type Sim3D = { N: number; X: number[]; Y: number[]; Z: number[]; VX: number[]; VY: number[]; VZ: number[] };
  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], Z: [] as number[], VX: [] as number[], VY: [] as number[], VZ: [] as number[] }) as Box<Sim3D>;
  const AXRef = useRef<number[]>([]) as Box<number[]>;
  const AYRef = useRef<number[]>([]) as Box<number[]>;
  const AZRef = useRef<number[]>([]) as Box<number[]>;
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

  function com(): [number, number, number] {
    // 무게중심 — 매 스텝 다시 계산한다(별이 날아가도 성단이 따라간다).
    // 계산 자체가 데모의 주제: 중심을 고정하지 않고 합이 0이 되게 두면 성단 전체가 유영한다
    const sim = simRef.current;
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < sim.N; i++) { cx += sim.X[i]; cy += sim.Y[i]; cz += sim.Z[i]; }
    return [cx / sim.N, cy / sim.N, cz / sim.N];
  }

  function seed(): void {
    // 구면 등밀도 흩뿌리기 + 완만한 집단 회전. 궤도 속도는 구 대신 접선 방향 랜덤 —
    // 각자의 궤도면이 달라 원반처럼 정렬되지 않는다(구상 성단의 핵심 성질)
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.Z = []; sim.VX = []; sim.VY = []; sim.VZ = []; sim.N = 0;
    const rnd = mulberry32(33);
    const W = wRef.current, H = hRef.current;
    const R = Math.min(W, H) * 0.78;
    for (let i = 0; i < nstarsRef.current; i++) {
      const u = rnd() * 2 - 1, ph = rnd() * Math.PI * 2;
      const sq = Math.sqrt(1 - u * u);
      const rr = R * 0.94 * Math.cbrt(rnd());       // 구 등밀도 — r³ 균등
      const dx = sq * Math.cos(ph), dy = sq * Math.sin(ph), dz = u;
      sim.X.push(W * 0.5 + dx * rr);
      sim.Y.push(H * 0.5 + dy * rr * 0.92);
      sim.Z.push(dz * rr);
      // 접선 속도 — 위치와 수직인 방향 중 하나를 골라 원궤도 스케일로. 궤도면 제각각
      const tx = -dy, ty = dx, tz = 0;
      const tl = Math.hypot(tx, ty) || 1;
      const vv = Math.sqrt(G * nstarsRef.current / Math.max(rr, 12)) * (0.55 + rnd() * 0.5);
      sim.VX.push((tx / tl) * vv + spinRef.current * 14 * dy + (rnd() - 0.5) * 6);
      sim.VY.push((ty / tl) * vv + spinRef.current * 14 * dx + (rnd() - 0.5) * 6);
      sim.VZ.push((rnd() - 0.5) * vv * 1.2);
      sim.N++;
    }
  }

  function step(): void {
    // 전 쌍 O(N²) 3차원 중력 — a_i = Σ G·(x_j - x_i)/(|d|²+ε²)^1.5 (근사 아님)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current, AZ = AZRef.current;
    const N = sim.N;
    let i: number, j: number, dx: number, dy: number, dz: number, d2: number, inv: number, f: number;
    for (i = 0; i < N; i++) { AX[i] = 0; AY[i] = 0; AZ[i] = 0; }
    for (i = 0; i < N; i++) {
      for (j = i + 1; j < N; j++) {
        dx = sim.X[j] - sim.X[i]; dy = sim.Y[j] - sim.Y[i]; dz = sim.Z[j] - sim.Z[i];
        d2 = dx * dx + dy * dy + dz * dz + SOFT2;
        inv = 1 / Math.sqrt(d2);
        f = G * inv * inv * inv;
        AX[i] += dx * f; AY[i] += dy * f; AZ[i] += dz * f;
        AX[j] -= dx * f; AY[j] -= dy * f; AZ[j] -= dz * f;
      }
    }
    for (i = 0; i < N; i++) {
      sim.VX[i] += AX[i] * DT; sim.VY[i] += AY[i] * DT; sim.VZ[i] += AZ[i] * DT;
      sim.X[i] += sim.VX[i] * DT; sim.Y[i] += sim.VY[i] * DT; sim.Z[i] += sim.VZ[i] * DT;
    }
  }

  function project(i: number): [number, number, number] {
    // 3D → 2D 투영. 초점거리로 원근(가까운 별이 크고 빠르다)
    const sim = simRef.current;
    const W = wRef.current, H = hRef.current;
    const s = FOCAL / (FOCAL + sim.Z[i]);
    return [W * 0.5 + (sim.X[i] - W * 0.5) * s, H * 0.5 + (sim.Y[i] - H * 0.5) * s, s];
  }

  function decay(): void {
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.013)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stamp(): void {
    // 잔상 — 투영 좌표로 궤도를 남긴다(궤도면이 제각각이라 곡선 뭉치가 쌓인다)
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let i = 0; i < sim.N; i++) {
        const p = project(i);
        chainCtx.strokeStyle = rgba(col.glow, 0.26);
        chainCtx.lineWidth = 1.7;
        chainCtx.beginPath();
        chainCtx.moveTo(prev[0][i], prev[1][i]);
        chainCtx.lineTo(p[0], p[1]);
        chainCtx.stroke();
      }
    }
    if (!prev) prevRef.current = [[], []];
    const pv = prevRef.current as [number[], number[]];
    pv[0].length = 0; pv[1].length = 0;
    for (let i = 0; i < sim.N; i++) { const p = project(i); pv[0].push(p[0]); pv[1].push(p[1]); }
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
    // 배경 별밭(정적·시드 고정)
    const rnd = mulberry32(44);
    for (let k = 0; k < 40; k++) {
      ctx.globalAlpha = 0.10 + rnd() * 0.20;
      ctx.fillStyle = rgba(col.glow, 0.6);
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 0.7 + 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 무게중심 표식 — 매 프레임 계산한 com 을 앰버 십자로 찍는다(성단이 유영하는 게 보인다)
    const c = com();
    const cz = FOCAL / (FOCAL + c[2]);
    const mx = W * 0.5 + (c[0] - W * 0.5) * cz, my = H * 0.5 + (c[1] - H * 0.5) * cz;
    // 별 — 원근 스케일로 크기·밝기 변화. z 가 가까울수록 크고 밝다
    for (let i = 0; i < sim.N; i++) {
      const p = project(i);
      const s = p[2];
      const cc = s > 1.06 ? col.hot : col.glow;     // 앞쪽 별은 앰버, 뒷쪽은 페리윙클
      ctx.fillStyle = rgba(cc, 0.12 * s);
      ctx.beginPath(); ctx.arc(p[0], p[1], 4.0 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(cc, 0.66 * s);
      ctx.beginPath(); ctx.arc(p[0], p[1], (1.4 + 1.1 * s) * s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = rgba(col.hot, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my);
    ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5);
    ctx.stroke();
  }

  function stillFrame(): void {
    // reduce — 궤도 뭉치가 쌓인 장면까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 200; s++) { step(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 3.0;
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
    spinRef.current = spin;
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
  }, [nstars, spin]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>구형으로 흩뿌린 별들이 무게중심을 제각각의 각도로 돌며 은하 원반과 달리 안쪽으로 뭉치지 않습니다</span>
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
          <span className={styles.meta}>별 280개 · 무게중심 자체 계산</span>
          <span className={styles.metaDim}>canvas · center of mass · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
