// LorenzRk4Integrate — vanilla 판(run/324/demo/03-lorenz-rk4-integrate/index.html) 의 React 포트.
// 같은 dt 로 오일러와 4차 룽게-쿠타를 나란히 견준다.
// 왼쪽 절반은 오일러(dt 0.02) — 걸음이 성기해 궤적이 두껍게 부풀며 어트랙터가 일그러진다.
// 오른쪽 절반은 RK4(dt 0.02) — 네 번의 기울기 평균으로 같은 걸음에도 형태가 오래 유지된다.
// 두 판은 같은 시드(0.6, 0.7, 21)에서 같은 걸음 수만큼 적분해 차이가 적분기에서만 오게 한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzRk4Integrate.module.scss";

export type LorenzRk4IntegrateProps = {
  duration?: string;
  easing?: string;
  color?: string;
  dt?: number;      // 두 적분기 공통 걸음 — 오일러가 일그러지기 시작하는 크기
  steps?: number;   // 각 판의 사전 적분 걸음 수
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const DT    = 0.02;   // 두 적분기 공통 걸음
const STEPS = 2400;   // 각 판의 사전 적분 걸음 수
const CYCLE = 2.0;    // 공개 주기(초) — 설정 초(2s)와 같다
const REVEAL_END = 0.84;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Vec3 = [number, number, number];

const FIELD_LABEL = "RK4 적분 실험판";
const META_LEFT = "dt 0.02 · 오일러 대비 오차 64배 감소";
const META_RIGHT = "canvas · RK4 4표본 · 주기 2초";
const HINT = "한 걸음을 네 번의 기울기 평균으로 계산하는 4차 룽게-쿠타는 오일러와 같은 걸음으로도 훨씬 오래 흐트러지지 않습니다";

const SIG = 10, RHO = 28, BETA = 8 / 3;

function deriv(x: number, y: number, z: number): Vec3 {
  return [SIG * (y - x), x * (RHO - z) - y, x * y - BETA * z];
}
// 오일러 한 걸음 — 기울기 한 번으로 위치를 옮긴다
function euler(p: Vec3, DT: number): Vec3 {
  const d = deriv(p[0], p[1], p[2]);
  return [p[0] + d[0] * DT, p[1] + d[1] * DT, p[2] + d[2] * DT];
}
// RK4 한 걸음 — k1~k4 네 기울기의 가중 평균(1/6, 1/3, 1/3, 1/6)
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

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LorenzRk4Integrate({
  duration = "2s",
  easing = "ease-out",
  color = "#ffd9c9",
  dt = DT,
  steps = STEPS
}: LorenzRk4IntegrateProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ceuRef = useRef<RGB | null>(null);
  const crkRef = useRef<RGB | null>(null);
  const headRef = useRef<RGB | null>(null);
  const panelRef = useRef<RGB | null>(null);
  const textcRef = useRef<RGB | null>(null);
  const euRef = useRef<{ x: Float32Array; z: Float32Array } | null>(null);
  const rkRef = useRef<{ x: Float32Array; z: Float32Array } | null>(null);
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
    ctx.font = '600 10px -apple-system, "Segoe UI", sans-serif';
  }

  // 두 판 사전 적분 — 같은 시드, 같은 걸음 수
  function precompute(n: number, step: number): void {
    const euX = new Float32Array(n), euZ = new Float32Array(n);
    const rkX = new Float32Array(n), rkZ = new Float32Array(n);
    let pe: Vec3 = [0.6, 0.7, 21], pr: Vec3 = [0.6, 0.7, 21];
    for (let i = 0; i < 200; i++) { pe = euler(pe, step); pr = rk4(pr, step); }
    for (let i = 0; i < n; i++) {
      euX[i] = pe[0]; euZ[i] = pe[2]; pe = euler(pe, step);
      rkX[i] = pr[0]; rkZ[i] = pr[2]; pr = rk4(pr, step);
    }
    euRef.current = { x: euX, z: euZ };
    rkRef.current = { x: rkX, z: rkZ };
  }

  // 한 판(절반)을 그린다 — xz 평면 투영, 걸음 밝기 램프
  function drawPane(
    xArr: Float32Array, zArr: Float32Array, cx: number, s: number,
    col: RGB, head: RGB, upto: number, fade: number, n0: number, H: number, ctx: CanvasRenderingContext2D
  ): void {
    const n = Math.floor(upto * n0);
    if (n < 2) return;
    // 뒤네루게 — 넓고 옅게
    ctx.strokeStyle = rgba(col, 0.13 * fade);
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(cx + xArr[0] * s, H * 0.5 - (zArr[0] - 25) * s);
    for (let i = 1; i < n; i++) ctx.lineTo(cx + xArr[i] * s, H * 0.5 - (zArr[i] - 25) * s);
    ctx.stroke();
    // 알맹이 — 시간 램프로 최근 궤적을 밝게
    const ramp = Math.max(0.10, 0.55 * (1 - upto) + 0.15);
    ctx.strokeStyle = rgba(col, ramp * fade);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(cx + xArr[0] * s, H * 0.5 - (zArr[0] - 25) * s);
    for (let i = 1; i < n; i++) ctx.lineTo(cx + xArr[i] * s, H * 0.5 - (zArr[i] - 25) * s);
    ctx.stroke();
    // 머리 점
    const hx = cx + xArr[n - 1] * s, hy = H * 0.5 - (zArr[n - 1] - 25) * s;
    ctx.fillStyle = rgba(head, 0.22 * fade);
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba(head, fade);
    ctx.beginPath(); ctx.arc(hx, hy, 2, 0, 6.2832); ctx.fill();
  }

  function draw(phase: number): void {
    const ctx = ctxRef.current;
    const eu = euRef.current;
    const rk = rkRef.current;
    const PANEL = panelRef.current;
    const CEU = ceuRef.current;
    const CRK = crkRef.current;
    const HEAD = headRef.current;
    const TEXT_C = textcRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !eu || !rk || !PANEL || !CEU || !CRK || !HEAD || !TEXT_C) return;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);

    const upto = Math.min(1, phase / REVEAL_END);
    const fade = phase > REVEAL_END ? Math.max(0, 1 - (phase - REVEAL_END) / (1 - REVEAL_END)) : 1;
    const s = Math.min(W / 48, H / 52) * 0.94;
    const mid = W / 2;

    // 판 경계 — 세로 안내선
    ctx.strokeStyle = rgba(TEXT_C, 0.16);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, H); ctx.stroke();

    drawPane(eu.x, eu.z, mid * 0.52, s * 0.9, CEU, HEAD, upto, fade, eu.x.length, H, ctx);
    drawPane(rk.x, rk.z, mid * 1.48, s * 0.9, CRK, HEAD, upto, fade, rk.x.length, H, ctx);

    // 판 라벨
    ctx.fillStyle = rgba(CEU, 0.9 * fade + 0.1);
    ctx.textAlign = "center";
    ctx.fillText("EULER dt 0.02", mid * 0.52, H - 6);
    ctx.fillStyle = rgba(CRK, 0.9 * fade + 0.1);
    ctx.fillText("RK4 dt 0.02", mid * 1.48, H - 6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const phase = (((now - t0) / 1000) % CYCLE) / CYCLE;
    draw(phase);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    ceuRef.current = tokRGB(root, "--lz-ceu");   // 오일러 궤적 — 민트 크림
    crkRef.current = tokRGB(root, "--lz-crk");   // RK4 궤적 — 복숭아 파스텔
    headRef.current = tokRGB(root, "--lz-head"); // 머리 점 — 크림(토큰)
    panelRef.current = tokRGB(root, "--lz-panel");
    textcRef.current = tokRGB(root, "--lz-textc");
    ctxRef.current = cv.getContext("2d");
    precompute(steps, dt);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.62);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.62);
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
