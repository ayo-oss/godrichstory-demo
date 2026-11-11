// GalaxyNbodyTrailHistory — vanilla 판(run/322/demo/08-galaxy-nbody-trail-history/index.html) 의 React 포트.
// 궤적 히스토리 — 잔상을 "지우는" 게 아니라 "쌓는" 장면.
// 01~07 의 잔상 체인은 destination-out 으로 매 프레임 조금씩 지웠다(흐름만 남긴다).
// 여기선 정반대: 배경 위에 지난 프레임을 globalAlpha 로 깔아 두기만 한다 —
// decay 가 없으므로 궤도가 계속 쌓여 나선팔이 "한 장의 팔"이 아니라
// "수백 개 궤도의 누적"임이 시간이 지날수록 드러난다(장면의 주제 그 자체).
// 계산은 02 와 같은 전 쌍 O(N²) + 중심질량 + leapfrog(근사 아님).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyTrailHistory.module.scss";

export type GalaxyNbodyTrailHistoryProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 원반 별 수
  layers?: number;  // 잔상 누적 단수(스텝당 깔리는 알파 겹) — 변형 "누적 깊이"
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Sim2D = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[] };

const FIELD_LABEL = "궤적 히스토리 실험판";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 60.0, SOFT2 = 36;
const DT = 1 / 60;
const MHALO = 6200;   // 중심 질량(핵+헤일로) — 그리지 않는다. 차등회전의 원천

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function GalaxyNbodyTrailHistory({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 300,
  layers = 3
}: GalaxyNbodyTrailHistoryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const layersRef = useRef(layers) as Box<number>;
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
    // 중심 질량 + 전 쌍 O(N²) 뉴턴 — a_i = Σ G·(x_j - x_i)/(|d|²+ε²)^1.5 (근사 아님)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    const W = wRef.current, H = hRef.current;
    const N = sim.N;
    let i: number, j: number, dx: number, dy: number, d2: number, inv: number, f: number;
    for (i = 0; i < N; i++) { AX[i] = 0; AY[i] = 0; }
    const cx = W * 0.5, cy = H * 0.5;
    for (i = 0; i < N; i++) {
      dx = cx - sim.X[i]; dy = cy - sim.Y[i];
      d2 = dx * dx + dy * dy + SOFT2;
      inv = 1 / Math.sqrt(d2);
      f = G * MHALO * inv * inv * inv;
      AX[i] += dx * f; AY[i] += dy * f;
    }
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

  function seed(): void {
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.N = 0;
    aReadyRef.current = false;
    const rnd = mulberry32(21);
    const W = wRef.current, H = hRef.current;
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.46;
    for (let i = 0; i < nstarsRef.current; i++) {
      const far = rnd() < 0.44;                       // 상당수 별은 이심 궤도 — 궤적이 원반 밖까지 뻗는다
      const r = far
        ? R * (0.22 + 2.30 * rnd())                   // 먼 별: 최대 ~2.5R 바깥까지 오가는 궤도
        : 0.10 * R + R * 0.80 * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2 + 0.14 * Math.sin(r * 0.16);   // 초기 밀도 요동 — 쌓이면 나선팔
      const v = Math.sqrt(G * MHALO / Math.max(r, 8)) * (far ? 0.80 : 1.06);  // 원반 살짝 과속 → 궤적이 살짝 벌어진다
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r * 0.94);
      sim.VX.push(-Math.sin(a) * v + (rnd() - 0.5) * 1.5);
      sim.VY.push(Math.cos(a) * v * 0.94 + (rnd() - 0.5) * 1.5);
      sim.N++;
    }
  }

  // decay 가 없다 — 잔상 체인은 지워지지 않고 계속 쌓인다(이 데모의 주제).
  // 대신 루프 되감을 때만 통째로 지운다.

  function stamp(): void {
    // 누적 — 스텝마다 globalAlpha 를 낮게 해 여러 겹 깔면 궤도가 선으로 굳는다
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let L = 0; L < layersRef.current; L++) {   // LAYERS 겹 — 쌓임 속도 변형
        chainCtx.globalAlpha = 0.22 / layersRef.current * (L + 1);
        for (let i = 0; i < sim.N; i++) {
          const r = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
          const c = r < Math.min(W, H) * 0.18 ? col.hot : col.glow;
          chainCtx.strokeStyle = rgba(c, 0.9);
          chainCtx.lineWidth = r < Math.min(W, H) * 0.18 ? 2.6 : 2.1;
          chainCtx.beginPath();
          chainCtx.moveTo(prev[0][i], prev[1][i]);
          chainCtx.lineTo(sim.X[i], sim.Y[i]);
          chainCtx.stroke();
        }
      }
      chainCtx.globalAlpha = 1;
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
    const rnd = mulberry32(23);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.12 + rnd() * 0.22;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 누적 레이어 — 지워지지 않은 궤도 전체가 한 번에 얹힌다
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 현재 별 위치 — 밝은 코어(쌓인 궤도 위 지나가는 "지금")
    const R = Math.min(W, H);
    for (let i = 0; i < sim.N; i++) {
      const r = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
      const c = r < R * 0.16 ? col.hot : col.glow;
      ctx.fillStyle = rgba(c, 0.18);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 4.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.9);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = rgba(col.hot, 0.9);
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  function stillFrame(): void {
    // reduce — 궤도가 쌓여 팔이 드러난 장면까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 260; s++) { stepLeap(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 5.0;        // 5초 루프 — 길게 흘려 궤도가 충분히 쌓이게
    const target = Math.floor(loop / DT);
    while (simStepsRef.current < target) { stepLeap(); simStepsRef.current++; stamp(); }
    if (target < simStepsRef.current - 3) {
      seed(); simStepsRef.current = 0; prevRef.current = null;
      const chainCtx = chainCtxRef.current;
      if (chainCtx) chainCtx.clearRect(0, 0, wRef.current, hRef.current);
    }
    draw();
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nstarsRef.current = nstars;
    layersRef.current = layers;
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
  }, [nstars, layers]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>지난 프레임을 알파로 깔아 두면 궤도가 부드러운 선으로 쌓이고, 나선팔이 한 장이 아니라 궤도의 누적임이 드러납니다</span>
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
          <span className={styles.meta}>별 300개 · 잔상 누적 레이어</span>
          <span className={styles.metaDim}>canvas · globalAlpha history · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
