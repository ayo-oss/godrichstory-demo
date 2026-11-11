// GalaxyNbodyDarkMatterHalo — vanilla 판(run/322/demo/04-galaxy-nbody-dark-matter-halo/index.html) 의 React 포트.
// 암흑물질 헤일로 — 토글 한 번으로 은하 회전 곡선이 바뀌는 장면.
// ★ 근사 명시: 이 항목은 별 상호중력을 전 쌍 O(N²) 로 계산하지 않는다.
// 매 스텝 별 질량을 반경 빈(격자)에 누적해 구면 누적 질량 M(r) 을 만들고,
// 각 별은 자기 반경 안쪽 질량만큼 중심 방향으로 끌린다(등방 근사 — 방향 정보를 버린 격자 질량 근사).
// 헤일로 ON: 같은 격자에 보이지 않는 질량 프로파일(ρ ∝ 1/(r²+rc²))을 얹어 M(r) 을 불린다 —
// 바깥 별의 원궤도 속도가 유지된다(플랫 회전 곡선). OFF: 바깥이 결합을 못 이겨 팽창한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GalaxyNbodyDarkMatterHalo.module.scss";

export type GalaxyNbodyDarkMatterHaloProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;    // 원반 별 수
  haloboost?: number; // 헤일로 질량 / 별 총질량 — 변형 "헤일로 질량"이 2.6→5.0으로
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type SimM = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[]; MASS: number[] };

const FIELD_LABEL = "암흑물질 헤일로 실험판";
const LABEL_OFF = "헤일로 꺼짐";
const LABEL_ON = "헤일로 켜짐";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 60.0, SOFT2 = 90;
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

export default function GalaxyNbodyDarkMatterHalo({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 300,
  haloboost = 2.6
}: GalaxyNbodyDarkMatterHaloProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const boostRef = useRef(haloboost) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [haloOn, setHaloOn] = useState(false);   // 버튼 라벨 상태 — 시뮬 상태(HALORef)와 동기
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

  const simRef = useRef({ N: 0, X: [] as number[], Y: [] as number[], VX: [] as number[], VY: [] as number[], MASS: [] as number[] }) as Box<SimM>;
  const AXRef = useRef<number[]>([]) as Box<number[]>;
  const AYRef = useRef<number[]>([]) as Box<number[]>;
  const aReadyRef = useRef(false) as Box<boolean>;
  const prevRef = useRef<[number[], number[]] | null>(null);
  const simStepsRef = useRef(0) as Box<number>;
  const HALORef = useRef(false) as Box<boolean>;       // 헤일로 상태 — 자동 루프가 3초마다 전환, 버튼 클릭 시 고정
  const autoHaloRef = useRef(true) as Box<boolean>;

  // ── 격자 질량 근사 상태 ──
  const K = 28;                       // 반경 빈(격자) 수
  const rmaxRef = useRef(10) as Box<number>;
  const binMassRef = useRef<number[]>([]) as Box<number[]>;
  const cumMassRef = useRef<number[]>([]) as Box<number[]>;
  const haloMassRef = useRef<number[]>([]) as Box<number[]>;

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

  function rEdge(k: number): number { return rmaxRef.current * Math.pow(k / K, 0.8); }   // 중심 촘촘 격자
  function binOf(r: number): number {
    const k = Math.ceil(K * Math.pow(Math.min(r, rmaxRef.current) / rmaxRef.current, 1 / 0.8)) - 1;
    return k < 0 ? 0 : (k >= K ? K - 1 : k);
  }

  function buildHalo(): void {
    // 헤일로 프로파일 — 고정 분포(별과 충돌하지 않는 차가운 암흑물질 가정).
    // ρ ∝ 1/(r²+rc²) 를 격자 빈에 적분해 담아 둔다(한 번만 계산)
    const sim = simRef.current;
    const rc = Math.min(wRef.current, hRef.current) * 0.15;
    let mstar = 0;
    for (let i = 0; i < sim.N; i++) mstar += sim.MASS[i];
    const raw: number[] = [];
    for (let k = 0; k < K; k++) {
      const r0 = rEdge(k), r1 = rEdge(k + 1);
      raw.push((Math.atan(r1 / rc) - Math.atan(r0 / rc)) * rc);  // ∫ r²/(r²+rc²) dr 근사 형태
    }
    let sum = 0;
    for (let k = 0; k < K; k++) sum += raw[k];
    for (let k = 0; k < K; k++) haloMassRef.current[k] = raw[k] / sum * mstar * boostRef.current;
  }

  function accel(): void {
    // 격자 재구성 — 별 질량을 빈에 누적하고 구면 누적 질량 CM[k] 를 만든다
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    const binMass = binMassRef.current, cumMass = cumMassRef.current, haloMass = haloMassRef.current;
    const W = wRef.current, H = hRef.current;
    let i: number, k: number;
    for (k = 0; k < K; k++) binMass[k] = 0;
    const cx = W * 0.5, cy = H * 0.5;
    for (i = 0; i < sim.N; i++) {
      const rr = Math.hypot(sim.X[i] - cx, sim.Y[i] - cy);
      binMass[binOf(rr)] += sim.MASS[i];
    }
    let acc = 0;
    for (k = 0; k < K; k++) {
      const hm = HALORef.current ? haloMass[k] : 0;      // 토글 — 헤일로 질량을 같은 격자에 얹는다
      binMass[k] += hm;
      acc += binMass[k];
      cumMass[k] = acc;
    }
    // 각 별의 가속도 — 안쪽 누적 질량 M(r) 만큼 중심 방향(등방 근사: 방향 정보 폐기)
    for (i = 0; i < sim.N; i++) {
      const dx = cx - sim.X[i], dy = cy - sim.Y[i];
      const r = Math.hypot(dx, dy);
      const bk = binOf(r);
      const Mr = cumMass[bk] - binMass[bk] * 0.5;        // 빈 중간값 근사
      const d3 = Math.pow(r * r + SOFT2, 1.5);
      const f = G * Mr / d3;
      AX[i] = dx * f; AY[i] = dy * f;
    }
  }

  function stepLeap(): void {
    // leapfrog — 격자 근사 가속도로도 절반 스텝 대칭으로 밀어 에너지를 보존한다
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
    // 원반 — 속도는 헤일로 ON 프로파일 기준 원궤도(플랫에 가깝게)로 심는다.
    // OFF 구간에서는 결합이 못 미쳐 바깥 별이 팽창한다(토글 차이가 곧바로 보인다)
    const sim = simRef.current;
    const AX = AXRef.current, AY = AYRef.current;
    sim.X = []; sim.Y = []; sim.VX = []; sim.VY = []; sim.MASS = []; sim.N = 0;
    const rnd = mulberry32(5);
    const W = wRef.current, H = hRef.current;
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.40;
    rmaxRef.current = R * 1.6;
    for (let i = 0; i < nstarsRef.current; i++) {
      const r = 0.10 * R + R * 0.90 * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      sim.MASS.push(0.5 + rnd() * 0.8);
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r * 0.88);
      sim.N++;
    }
    buildHalo();
    // 속도는 위치가 다 심어진 뒤 M(r) 격자로 계산(누적 질량 기준 원궤도)
    HALORef.current = true; accel(); HALORef.current = false;
    for (let i = 0; i < sim.N; i++) {
      const dx = sim.X[i] - cx, dy = sim.Y[i] - cy;
      const v = Math.sqrt(Math.max(AX[i] * -dx + AY[i] * -dy, 1e-6) * Math.hypot(dx, dy));
      const tl = Math.hypot(dx, dy) || 1;
      sim.VX.push(-dy / tl * v + (rnd() - 0.5) * 1.2);
      sim.VY.push(dx / tl * v * 0.88 + (rnd() - 0.5) * 1.2);
    }
    aReadyRef.current = false;
  }

  function decay(): void {
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.020)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stamp(): void {
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    const sim = simRef.current;
    const prev = prevRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx || !col) return;
    if (prev) {
      for (let i = 0; i < sim.N; i++) {
        const r = Math.hypot(sim.X[i] - W * 0.5, sim.Y[i] - H * 0.5);
        chainCtx.strokeStyle = rgba(r < Math.min(W, H) * 0.16 ? col.hot : col.glow, 0.24);
        chainCtx.lineWidth = 1.2;
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
    const rnd = mulberry32(6);
    ctx.fillStyle = rgba(col.glow, 0.4);
    for (let k = 0; k < 34; k++) {
      ctx.globalAlpha = 0.10 + rnd() * 0.20;
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 0.7 + 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 별 — 코어는 파스텔 앰버, 바깥은 파스텔 페리윙클. 글로우 두 겹
    const cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H);
    for (let i = 0; i < sim.N; i++) {
      const r = Math.hypot(sim.X[i] - cx, sim.Y[i] - cy);
      const c = r < R * 0.15 ? col.hot : col.glow;
      ctx.fillStyle = rgba(c, 0.12);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.6 + 0.35 * (1 - r / (R * 0.42)));
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 1.3, 0, Math.PI * 2); ctx.fill();
    }
    // 헤일로 켜짐 — 보이지 않는 질량의 반경 스케일을 옅은 링으로만 암시한다
    if (HALORef.current) {
      ctx.strokeStyle = rgba(col.tail, 0.30);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.52, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 회전 곡선 인셋 — 빈별 평균 접선속도 실측. OFF: 하강 / ON: 플랫
    const gx0 = W - 104, gy0 = 12, gw = 88, gh = 62;
    ctx.fillStyle = rgba(col.ink, 0.78);
    ctx.fillRect(gx0, gy0, gw, gh);
    ctx.strokeStyle = rgba(col.glow, 0.35);
    ctx.lineWidth = 1;
    ctx.strokeRect(gx0 + 0.5, gy0 + 0.5, gw, gh);
    const vsum: number[] = [], vcnt: number[] = [];
    for (let k = 0; k < K; k++) { vsum[k] = 0; vcnt[k] = 0; }
    let vmax = 1;
    for (let i = 0; i < sim.N; i++) {
      const dx = sim.X[i] - cx, dy = sim.Y[i] - cy;
      const vt = Math.abs(-dy * sim.VX[i] + dx * sim.VY[i]) / Math.max(Math.hypot(dx, dy), 1);
      const bk = binOf(Math.hypot(dx, dy));
      vsum[bk] += vt; vcnt[bk]++;
      if (vt > vmax) vmax = vt;
    }
    ctx.strokeStyle = rgba(HALORef.current ? col.tail : col.glow, 0.95);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    let started = false;
    for (let k = 2; k < K; k++) {
      if (!vcnt[k]) continue;
      const vx = gx0 + 6 + (k / K) * (gw - 12);
      const vy = gy0 + gh - 8 - (vsum[k] / vcnt[k] / vmax) * (gh - 18);
      if (!started) { ctx.moveTo(vx, vy); started = true; }
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(col.hot, 0.8);
    ctx.font = "9px sans-serif";
    ctx.fillText(HALORef.current ? "flat" : "kepler", gx0 + 6, gy0 + 11);
  }

  function setHalo(on: boolean): void {
    HALORef.current = on;
    setHaloOn(on);
  }

  function stillFrame(): void {
    // reduce — 헤일로 ON 장면까지 적분한 뒤 한 장을 고정한다
    setHalo(true);
    for (let s = 0; s < 240; s++) { stepLeap(); stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 6.0;        // 6초 루프 — 3초 꺼짐 / 3초 켜짐 자동 전환
    if (autoHaloRef.current) setHalo(loop < 3.0);
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
    const field = fieldRef.current;
    if (!root || !field) return;
    nstarsRef.current = nstars;
    boostRef.current = haloboost;
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
    autoHaloRef.current = true;
    // 토글 — 버튼 클릭 시 자동 전환을 끄고 고정. 필드 클릭도 같은 동작(버튼 누름 제외)
    function onFieldClick(e: MouseEvent): void {
      const target = e.target as HTMLElement;
      if (target.closest("button")) return;
      autoHaloRef.current = false;
      setHalo(!HALORef.current);
    }
    field.addEventListener("click", onFieldClick);
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
      field.removeEventListener("click", onFieldClick);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nstars, haloboost]);

  function onHaloBtn(): void {
    autoHaloRef.current = false;
    setHalo(!HALORef.current);
  }

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>보이지 않는 질량 헤일로를 켜면 바깥 별의 회전 속도가 떨어지지 않고 유지됩니다 — 은하 가장자리가 빠른 이유</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <button
            className={styles.haloBtn}
            type="button"
            aria-pressed={haloOn}
            onClick={onHaloBtn}
          >
            <span hidden={haloOn}>{LABEL_OFF}</span>
            <span hidden={!haloOn}>{LABEL_ON}</span>
          </button>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>별 300개 · 격자 질량 근사</span>
          <span className={styles.metaDim}>canvas · grid approximation · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
