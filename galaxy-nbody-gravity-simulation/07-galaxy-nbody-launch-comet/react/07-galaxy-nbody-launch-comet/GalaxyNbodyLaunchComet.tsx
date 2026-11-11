// GalaxyNbodyLaunchComet — vanilla 판(run/322/demo/07-galaxy-nbody-launch-comet/index.html) 의 React 포트.
// 혜성 쏘기 — 포인터로 발사체를 던져 넣는 조작 장면.
// 무대: 원반 은하(중심 질량 + 별 180개). 드래그(pointerdown → pointermove → pointerup)로
// 새 혜성을 만들어 던진다 — 놓은 지점에서 당긴 반대 방향으로 slingshot 발사.
// 혜성은 같은 O(N²) 중력장에 그대로 들어간다: 각도·속도에 따라
//  · 궤도에 잡혀 타원 궤도(중심 질량 지배) — 첫 스침 후 포획
//  · 스침이 살짝 어긋나 그대로 탈출(쌍곡선) — 중력 도우거림
// 포인터 입력이 없어도 6발이 정해진 각도로 자동 발사된다(결정론 렌더).
// ※ 데모 소스의 AX/AY 버퍼 동기 수정(혜성 추가·삭제 시 aReady 리셋)이 이미 반영된 판을 그대로 포트한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as RPointerEvent } from "react";
import styles from "./GalaxyNbodyLaunchComet.module.scss";

export type GalaxyNbodyLaunchCometProps = {
  duration?: string;
  easing?: string;
  color?: string;
  nstars?: number;   // 원반 별 수
  launchv?: number;  // 발사 속도 배율(캔버스 대각선 비례) — 변형 "발사 속도"
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Sim2D = { N: number; X: number[]; Y: number[]; VX: number[]; VY: number[] };
type Aim = { x0: number; y0: number; x1: number; y1: number };
type AutoShot = { t: number; x: number; y: number; ang: number; sp: number };
type Comet = { idx: number; born: number };

const FIELD_LABEL = "혜성 쏘기 실험판";
const AIM_LABEL = "드래그로 발사";

// G·질량은 캔버스 픽셀 단위 시뮬레이션 값(물리 상수 아님 — 글에서 설명)
const G = 60.0, SOFT2 = 40;
const DT = 1 / 60;
const MHALO = 5400;   // 중심 질량 — 원반을 지탱하는 핵(그리지 않는다)

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function (): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 자동 발사 스케줄 — 포인터 입력이 없어도 장면이 차게 찬다(결정론: 시드·각도 고정)
function autoSchedule(): AutoShot[] {
  return [
    { t: 10,  x: 0.04, y: 0.14, ang: 0.48, sp: 1.00 },
    { t: 34,  x: 0.96, y: 0.20, ang: 2.35, sp: 0.90 },
    { t: 58,  x: 0.48, y: 0.03, ang: 1.20, sp: 0.66 },
    { t: 80,  x: 0.08, y: 0.86, ang: 0.80, sp: 1.10 },
    { t: 100, x: 0.92, y: 0.90, ang: 3.70, sp: 0.95 },
    { t: 116, x: 0.30, y: 0.06, ang: 1.60, sp: 0.75 }
  ];
}

export default function GalaxyNbodyLaunchComet({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  nstars = 180,
  launchv = 0.55
}: GalaxyNbodyLaunchCometProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB; tail: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nstarsRef = useRef(nstars) as Box<number>;
  const launchvRef = useRef(launchv) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [still, setStill] = useState(false);
  const [aiming, setAiming] = useState(false);     // 조준 라벨 표시
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
  const nc0Ref = useRef(0) as Box<number>;          // 원반 별 수 고정(혜성 이전)
  const cometsRef = useRef<Comet[]>([]) as Box<Comet[]>;
  const aimRef = useRef<Aim | null>(null) as Box<Aim | null>;
  const autoRef = useRef<AutoShot[]>([]) as Box<AutoShot[]>;

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
    // 중심 질량 + 전 쌍 O(N²) 별 상호 중력(혜성 포함 — 배열 뒤에 추가돼 있다)
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
    cometsRef.current = [];
    const rnd = mulberry32(17);
    const W = wRef.current, H = hRef.current;
    const cx = W * 0.5, cy = H * 0.5;
    const R = Math.min(W, H) * 0.46;
    for (let i = 0; i < nstarsRef.current; i++) {
      const far = rnd() < 0.38;                       // 바깥 별 — 원반 밖까지 오가는 넓은 궤도
      const r = far
        ? R * (0.46 + 1.75 * rnd())
        : 0.12 * R + R * 0.80 * Math.sqrt(rnd());
      const a = rnd() * Math.PI * 2;
      const v = Math.sqrt(G * MHALO / Math.max(r, 8)) * (far ? 0.80 : 1.0);
      sim.X.push(cx + Math.cos(a) * r);
      sim.Y.push(cy + Math.sin(a) * r * 0.90);
      sim.VX.push(-Math.sin(a) * v + (rnd() - 0.5) * 1.4);
      sim.VY.push(Math.cos(a) * v * 0.90 + (rnd() - 0.5) * 1.4);
      sim.N++;
    }
    nc0Ref.current = sim.N;
  }

  function removeStar(idx: number): void {
    // 배열 압축 — 인덱스가 뒤로 밀리는 혜성 참조를 같이 고친다
    const sim = simRef.current;
    const prev = prevRef.current;
    sim.X.splice(idx, 1); sim.Y.splice(idx, 1); sim.VX.splice(idx, 1); sim.VY.splice(idx, 1); sim.N--;
    aReadyRef.current = false;
    if (prev) { prev[0].splice(idx, 1); prev[1].splice(idx, 1); }
    for (let c = 0; c < cometsRef.current.length; c++) {
      if (cometsRef.current[c].idx > idx) cometsRef.current[c].idx--;
    }
  }

  function addComet(px: number, py: number, vx: number, vy: number, born: number): void {
    // 혜성 — 별 배열 뒤에 추가(같은 중력 계산). 오래된 혜성은 되감을 때 같이 지운다
    const sim = simRef.current;
    const prev = prevRef.current;
    sim.X.push(px); sim.Y.push(py); sim.VX.push(vx); sim.VY.push(vy); sim.N++;
    aReadyRef.current = false;   // AX/AY 버퍼가 이전 크기(혜성 이전)다 — 재계산 전에 쓰면 undefined*NaN 전파
    if (prev) { prev[0].push(px); prev[1].push(py); }   // 잔상 이전점 배열도 같은 길이로
    cometsRef.current.push({ idx: sim.N - 1, born: born });
    if (cometsRef.current.length > 4) {
      const old = cometsRef.current.shift();
      if (old) removeStar(old.idx);
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
        const isComet = i >= nc0Ref.current;
        chainCtx.strokeStyle = rgba(isComet ? col.hot : col.glow, isComet ? 0.55 : 0.24);
        chainCtx.lineWidth = isComet ? 2.6 : 1.5;
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
    const aim = aimRef.current;
    if (!ctx || !chainCv || !col) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = rgb(col.ink);
    ctx.fillRect(0, 0, W, H);
    const rnd = mulberry32(18);
    ctx.fillStyle = rgba(col.glow, 0.35);
    for (let k = 0; k < 40; k++) {
      const bx = rnd() * W, by = rnd() * H, br = rnd() * 0.8 + 0.3;
      ctx.globalAlpha = 0.12 + rnd() * 0.22;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(chainCv, 0, 0, W, H);
    // 원반 별 — 페리윙클 점
    const nc0 = nc0Ref.current;
    for (let i = 0; i < nc0; i++) {
      ctx.fillStyle = rgba(col.glow, 0.11);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(col.glow, 0.6);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // 중심 질량 자리 — 앰버 점
    ctx.fillStyle = rgba(col.hot, 0.9);
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.5, 2.4, 0, Math.PI * 2); ctx.fill();
    // 혜성 — 앰버 큰 글로우 + 코어
    for (let i = nc0; i < sim.N; i++) {
      ctx.fillStyle = rgba(col.hot, 0.18);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(col.hot, 0.65);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(col.hot, 1);
      ctx.beginPath(); ctx.arc(sim.X[i], sim.Y[i], 2.0, 0, Math.PI * 2); ctx.fill();
    }
    // 조준선 — 드래그 중에만. 당긴 방향 반대로 발사된다(slingshot)
    if (aim) {
      ctx.strokeStyle = rgba(col.tail, 0.9);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(aim.x0, aim.y0);
      ctx.lineTo(aim.x1, aim.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(col.hot, 0.95);
      ctx.beginPath();
      ctx.moveTo(aim.x0, aim.y0);
      ctx.lineTo(aim.x0 + (aim.x0 - aim.x1) * 2.2, aim.y0 + (aim.y0 - aim.y1) * 2.2);
      ctx.stroke();
      ctx.fillStyle = rgba(col.hot, 0.9);
      ctx.beginPath(); ctx.arc(aim.x0, aim.y0, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  function fireAuto(): void {
    // 자동 발사 — 정해진 시각에 스케줄의 혜성을 만들어 던진다
    const W = wRef.current, H = hRef.current;
    const diag = Math.hypot(W, H);
    const AUTO = autoRef.current;
    while (AUTO.length && AUTO[0].t <= simStepsRef.current) {
      const a = AUTO.shift();
      if (!a) break;
      const sp = diag * 0.42 * a.sp * launchvRef.current;
      addComet(W * a.x, H * a.y, Math.cos(a.ang) * sp, Math.sin(a.ang) * sp, simStepsRef.current);
    }
  }

  // ── 포인터 발사 — pointerdown → pointermove(조준) → pointerup(발사) ──
  function ptr(e: RPointerEvent<HTMLDivElement>): { x: number; y: number } {
    const cv = cvRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e: RPointerEvent<HTMLDivElement>): void {
    const p = ptr(e);
    aimRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    setAiming(true);
    e.preventDefault();
  }

  function onPointerMove(e: RPointerEvent<HTMLDivElement>): void {
    const aim = aimRef.current;
    if (!aim) return;
    const p = ptr(e);
    aim.x1 = p.x; aim.y1 = p.y;
  }

  function onPointerUp(e: RPointerEvent<HTMLDivElement>): void {
    const aim = aimRef.current;
    if (!aim) return;
    const p = ptr(e);
    const dx = aim.x0 - p.x, dy = aim.y0 - p.y;    // 당긴 반대 = 발사 방향
    const len = Math.hypot(dx, dy);
    if (len > 6) {
      const sp = Math.min(260, len * 2.2) * launchvRef.current;
      addComet(aim.x0, aim.y0, dx / len * sp, dy / len * sp, simStepsRef.current);
    }
    aimRef.current = null;
    setAiming(false);
  }

  function onPointerLeave(): void {
    aimRef.current = null;
    setAiming(false);
  }

  function stillFrame(): void {
    // reduce — 혜성 2발이 궤도에 오른 장면까지 적분한 뒤 한 장 고정
    for (let s = 0; s < 100; s++) { fireAuto(); stepLeap(); simStepsRef.current++; stamp(); }
    draw();
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const loop = ((now - t0) / 1000) % 3.6;        // 3.6초 루프 — 4연발 → 궤도/탈출이 갈리는 순간
    const target = Math.floor(loop / DT);
    while (simStepsRef.current < target) { fireAuto(); stepLeap(); simStepsRef.current++; stamp(); }
    if (target < simStepsRef.current - 3) {
      seed(); simStepsRef.current = 0; prevRef.current = null;
      autoRef.current = autoSchedule();
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
    launchvRef.current = launchv;
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
    autoRef.current = autoSchedule();
    function onResize(): void {
      fit(); seed(); simStepsRef.current = 0; prevRef.current = null; aReadyRef.current = false;
      autoRef.current = autoSchedule();   // 스케줄 되감기
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
  }, [nstars, launchv]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>은하 위를 드래그해 새 별을 던져 넣어 보세요. 각도에 따라 궤도에 잡히기도, 그대로 탈출하기도 합니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <span className={styles.aim} hidden={!aiming}>{AIM_LABEL}</span>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}>별 180개 · 끌어당기는 중심 질량</span>
          <span className={styles.metaDim}>canvas · drag to launch · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
