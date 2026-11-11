// GalaxyNbodyDeepFieldScene — vanilla 판(run/322/demo/09-galaxy-nbody-deep-field-scene/index.html) 의 React 포트.
// 심우주 씬 — 성운을 깐 무대에 은하 3개를 놓는 장면.
// 무대: createRadialGradient 로 구운 성운 스프라이트 3장(청록·장미·앰버)을
// 미리 별도 캔버스에 구워 두고 매 프레임 drawImage 로 얹는다 — 매 프레임 그라디언트를
// 다시 만들지 않아 330개 별 계산과 함께 돌아도 프레임이 나간다.
// 은하 3개(별 110+110+110)는 01 과 같은 전 쌍 O(N²) 뉴턴 중력 + leapfrog 으로 적분한다(근사 아님).
// 궤도는 대각선으로 엇갈리게 심는다 — 스침 → 조석 꼬리 → 합체(타원화) 순서의 진화 시퀀스가
// 한 루프 안에 차례로 나타난다. 별 색은 은하마다 다른 파스텔 3색.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyDeepFieldScene.module.scss";

export type GalaxyNbodyDeepFieldSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;  // 세 은하 합계 별 수
  nebula?: number;  // 성운 스프라이트 수 — 변형 "성운 밀도"
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type SimG = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[]; GID: number[] };
type NebSprite = { cv: HTMLCanvasElement; x: number; y: number; sz: number };

const FIELD_LABEL = "심우주 은하 진화 실험판";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 120.0, SOFT2 = 20;
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

export default function GalaxyNbodyDeepFieldScene({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 330,
  nebula = 3
}: GalaxyNbodyDeepFieldSceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nebRef = useRef<NebSprite[]>([]) as Box<NebSprite[]>;   // 구워 둔 성운 스프라이트
  const nstarsRef = useRef(nstars) as Box<number>;
  const nebulaRef = useRef(nebula) as Box<number>;
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

  function gcol(gid: number): RGB {
    const col = colRef.current;
    if (!col) return [0, 0, 0];
    return [col.glow, col.tail, col.hot][gid % 3];
  }

  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], VX: [] as number[], VY: [] as number[], GID: [] as number[] }) as Box<SimG>;
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
    bakeNebulas();
  }

  // 성운 스프라이트 — createRadialGradient 로 한 번 구워 둔다(매 프레임 재계산 없음)
  function bakeNebulas(): void {
    const col = colRef.current;
    if (!col) return;
    nebRef.current = [];
    const rnd = mulberry32(77);
    const W = wRef.current, H = hRef.current;
    const cols: RGB[] = [col.glow, col.tail, col.hot];
    for (let k = 0; k < nebulaRef.current; k++) {
      const s = document.createElement("canvas");
      const sz = Math.max(160, Math.round(Math.min(W, H) * (0.55 + rnd() * 0.5)));
      s.width = sz; s.height = sz;
      const sc = s.getContext("2d");
      if (!sc) continue;
      const g = sc.createRadialGradient(sz * 0.5, sz * 0.5, 0, sz * 0.5, sz * 0.5, sz * 0.5);
      const c = cols[k % 3];
      g.addColorStop(0.00, rgba(c, 0.16));
      g.addColorStop(0.35, rgba(c, 0.07));
      g.addColorStop(0.70, rgba(c, 0.02));
      g.addColorStop(1.00, rgba(c, 0));
      sc.fillStyle = g;
      sc.fillRect(0, 0, sz, sz);
      nebRef.current.push({ cv: s, x: 0.12 + rnd() * 0.76, y: 0.10 + rnd() * 0.80, sz: sz });
    }
  }

  function accel(): void {
    // 전 쌍 O(N²) 뉴턴 — a_i = Σ G·(x_j - x_i)/(|d|²+ε²)^1.5 (근사 아님)
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

  function placeDisk(cx: number, cy: number, R: number, count: number, phase: number, dvx: number, dvy: number, dir: number, gid: number, rnd: () => number): void {
    const sim = simRef.current;
    const M = R * R * 0.90;
    for (let i = 0; i < count; i++) {
      const r = R * Math.sqrt(rnd());
      const a = phase + (i / count) * Math.PI * 2 + rnd() * 0.5;
      const v = Math.sqrt(M / Math.max(r, 6)) * dir;
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r);
      sim.VX.push(dvx * R * 0.30 + -Math.sin(a) * v + (rnd() - 0.5) * 2);
      sim.VY.push(dvy * R * 0.30 + Math.cos(a) * v + (rnd() - 0.5) * 2);
      sim.GID.push(gid);
      sim.N++;
    }
  }

  function seed(): void {
    // 세 은하 — 대각선으로 엇갈리는 궤도. 시간이 흐르면 두 쌍이 스치고 세째가 합류한다.
    // 산개 별(STRAY)을 섞어 궤적이 캔버스 구석까지 뻗게 한다 — 심우주의 백업 별밭 역할
    const sim = simRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.GID = []; sim.N = 0;
    aReadyRef.current = false;
    const rnd = mulberry32(29);
    const W = wRef.current, H = hRef.current;
    const per = Math.floor(nstarsRef.current / 3);
    const R = Math.min(W, H) * 0.28;
    placeDisk(W * 0.22, H * 0.26, R, per - 28, 0, 0.62, -0.40, 1.00, 0, rnd);
    placeDisk(W * 0.78, H * 0.52, R, per - 28, Math.PI, -0.62, 0.40, 0.85, 1, rnd);
    placeDisk(W * 0.38, H * 0.82, R, nstarsRef.current - 2 * per - 28, Math.PI * 0.5, 0.34, -0.62, 0.92, 2, rnd);
    // 산개 별 84개 — 세 은하 사이 공간을 채워 스치는 순간 전체가 살아 난다
    for (let s = 0; s < 84; s++) {
      const sx = W * (0.04 + rnd() * 0.92);
      const sy = H * (0.06 + rnd() * 0.88);
      const sa = rnd() * Math.PI * 2;
      const sv = 38 + rnd() * 34;
      sim.X.push(sx); sim.Y.push(sy);
      sim.VX.push(Math.cos(sa) * sv); sim.VY.push(Math.sin(sa) * sv);
      sim.GID.push(s % 3);
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
    chainCtx.fillStyle = "rgba(0,0,0,0.013)";
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
        chainCtx.strokeStyle = rgba(gcol(sim.GID[i]), 0.26);
        chainCtx.lineWidth = 1.7;
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
    // 심우주 배경 — 잉크
    ctx.fillStyle = rgb(col.ink);
    ctx.fillRect(0, 0, W, H);
    // 먼 별밭(정적·시드 고정)
    const rnd = mulberry32(31);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 55; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.10 + rnd() * 0.24;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 성운 스프라이트 — 구워 둔 것을 얹는다. 아주 느린 드리프트로 심우주 배경 자체를 살린다
    const nebCvs = nebRef.current;
    for (let n = 0; n < nebCvs.length; n++) {
      const nb = nebCvs[n];
      const ph = n * 2.1;
      const dx = Math.sin(simStepsRef.current * 0.0031 + ph) * W * 0.035;
      const dy = Math.cos(simStepsRef.current * 0.0026 + ph * 1.7) * H * 0.045;
      const sc = 1 + Math.sin(simStepsRef.current * 0.0022 + ph) * 0.10;
      const sz2 = nb.sz * sc;
      ctx.drawImage(nb.cv, W * nb.x + dx - sz2 * 0.5, H * nb.y + dy - sz2 * 0.5, sz2, sz2);
    }
    // 궤도 잔상
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 별 — 은하별 파스텔 3색
    for (let i = 0; i < sim.N; i++) {
      const c = gcol(sim.GID[i]);
      ctx.fillStyle = rgba(c, 0.10);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.6);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // 각 은하의 코어 — 같은 색 밝은 점(무게중심)
    for (let g = 0; g < 3; g++) {
      let sx = 0, sy = 0, c = 0;
      for (let i2 = 0; i2 < sim.N; i2++) {
        if (sim.GID[i2] !== g) continue;
        sx += sim.X[i2]; sy += sim.Y[i2]; c++;
      }
      if (!c) continue;
      ctx.fillStyle = rgba(gcol(g), 0.9);
      ctx.beginPath(); ctx.arc(sx / c, sy / c, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function stillFrame(): void {
    // reduce — 첫 스침이 일어난 장면까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 200; s++) { stepLeap(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 4.5;        // 4.5초 루프 — 스침 → 꼬리 → 합류 순서가 다 보이게
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
    nebulaRef.current = nebula;
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
  }, [nstars, nebula]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>성운 스프라이트를 깐 심우주 무대에 여러 은하가 차례로 스치며 합쳐지는 진화 시퀀스를 배치했습니다</span>
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
          <span className={styles.meta}>은하 3개 · 별 330개</span>
          <span className={styles.metaDim}>canvas · nebula sprites · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
