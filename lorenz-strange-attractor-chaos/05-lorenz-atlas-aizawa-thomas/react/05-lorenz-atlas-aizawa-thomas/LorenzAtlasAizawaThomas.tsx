// LorenzAtlasAizawaThomas — vanilla 판(run/324/demo/05-lorenz-atlas-aizawa-thomas/index.html) 의 React 포트.
// 아이자와(구면): dx = (z−b)x − d·y, dy = d·x + (z−b)y, dz = c + a·z − z³/3 − (x²+y²)(1+e·z) + f·z·x³
// 토머스(나선):   dx = sin(y) − b·x, dy = sin(z) − b·y, dz = sin(x) − b·z
// 두 계통 모두 RK4 로 적분하고, 관찰축을 천천히 돌려 입체 형태를 보여준다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./LorenzAtlasAizawaThomas.module.scss";

export type LorenzAtlasAizawaThomasProps = {
  duration?: string;
  easing?: string;
  color?: string;
  steps?: number;   // 각 판의 사전 적분 걸음 수
  spinS?: number;   // 궤적 드러나기 주기(초) — 설정 초(2s)와 같다
};

// ── 변형 상수(기본값) — vanilla 판과 동일 ──
const DT     = 0.02;    // RK4 걸음
const STEPS  = 1800;    // 각 판의 사전 적분 걸음 수
const SPIN_S = 2.0;     // 궤적 드러나기 주기(초) — 설정 초(2s)와 같다
const SPIN_L = 12.0;    // 관찰축 회전 주기(초)
const REVEAL_END = 0.82;

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Vec3 = [number, number, number];
type Deriv = (x: number, y: number, z: number) => Vec3;

const FIELD_LABEL = "아이자와·토머스 실험판";
const META_LEFT = "좌 아이자와 · 우 토머스 · RK4";
const META_RIGHT = "canvas · 깊이 음영 · 주기 2초";
const HINT = "계수 몇 개를 바꾼 또 다른 미분방정식은 구면을 감도는 아이자와와 실뭉치 나선의 토머스를 그립니다";

// 아이자와 계수 — a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1 의 대표 형태
function dAizawa(x: number, y: number, z: number): Vec3 {
  const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
  return [
    (z - b) * x - d * y,
    d * x + (z - b) * y,
    c + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x
  ];
}
// 토머스 계수 b=0.19 — 주기적으로 겹는 나선
function dThomas(x: number, y: number, z: number): Vec3 {
  const b = 0.19;
  return [Math.sin(y) - b * x, Math.sin(z) - b * y, Math.sin(x) - b * z];
}
function rk4(p: Vec3, f: Deriv): Vec3 {
  const k1 = f(p[0], p[1], p[2]);
  const k2 = f(p[0] + k1[0] * DT / 2, p[1] + k1[1] * DT / 2, p[2] + k1[2] * DT / 2);
  const k3 = f(p[0] + k2[0] * DT / 2, p[1] + k2[1] * DT / 2, p[2] + k2[2] * DT / 2);
  const k4 = f(p[0] + k3[0] * DT, p[1] + k3[1] * DT, p[2] + k3[2] * DT);
  return [
    p[0] + DT / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    p[1] + DT / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    p[2] + DT / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])
  ];
}

function rgba(c: RGB, a: number): string {
  return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
}

export default function LorenzAtlasAizawaThomas({
  duration = "2s",
  easing = "ease-out",
  color = "#e6d9ff",
  steps = STEPS,
  spinS = SPIN_S
}: LorenzAtlasAizawaThomasProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const caRef = useRef<RGB | null>(null);
  const ctRef = useRef<RGB | null>(null);
  const headRef = useRef<RGB | null>(null);
  const panelRef = useRef<RGB | null>(null);
  const azRef = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array } | null>(null);
  const thRef = useRef<{ x: Float32Array; y: Float32Array; z: Float32Array } | null>(null);
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

  // 사전 적분 — 아이자와는 구 중심 근처, 토머스는 원점에서
  function precompute(n: number): void {
    const azX = new Float32Array(n), azY = new Float32Array(n), azZ = new Float32Array(n);
    const thX = new Float32Array(n), thY = new Float32Array(n), thZ = new Float32Array(n);
    let pa: Vec3 = [0.1, 0, 0], pt: Vec3 = [1.1, 1.2, -0.6];
    for (let i = 0; i < 100; i++) { pa = rk4(pa, dAizawa); pt = rk4(pt, dThomas); }
    for (let i = 0; i < n; i++) {
      azX[i] = pa[0]; azY[i] = pa[1]; azZ[i] = pa[2]; pa = rk4(pa, dAizawa);
      thX[i] = pt[0]; thY[i] = pt[1]; thZ[i] = pt[2]; pt = rk4(pt, dThomas);
    }
    azRef.current = { x: azX, y: azY, z: azZ };
    thRef.current = { x: thX, y: thY, z: thZ };
  }

  // 한 판 그리기 — xz 투영 + y 깊이 음영. xz: x 가로, z 세로, y 를 사선 성분으로
  function drawPane(
    X: Float32Array, Y: Float32Array, Z: Float32Array,
    cx: number, cy: number, s: number, col: RGB, head: RGB, n: number, fade: number, tilt: number,
    ctx: CanvasRenderingContext2D
  ): void {
    if (n < 2) return;
    // 뒤네루게
    ctx.strokeStyle = rgba(col, 0.12 * fade);
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    let hx = cx + (X[0] + Y[0] * tilt) * s, hy = cy - Z[0] * s;
    ctx.moveTo(hx, hy);
    for (let i = 1; i < n; i++) ctx.lineTo(cx + (X[i] + Y[i] * tilt) * s, cy - Z[i] * s);
    ctx.stroke();
    // 알맹이 — 걸음 진행에 따라 밝아지는 램프
    const ramp = Math.max(0.10, 0.5 * (1 - n / steps) + 0.15);
    ctx.strokeStyle = rgba(col, ramp * fade);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + (X[0] + Y[0] * tilt) * s, cy - Z[0] * s);
    for (let i = 1; i < n; i++) ctx.lineTo(cx + (X[i] + Y[i] * tilt) * s, cy - Z[i] * s);
    ctx.stroke();
    // 머리
    hx = cx + (X[n - 1] + Y[n - 1] * tilt) * s; hy = cy - Z[n - 1] * s;
    ctx.fillStyle = rgba(head, 0.22 * fade);
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 6.2832); ctx.fill();
    ctx.fillStyle = rgba(head, fade);
    ctx.beginPath(); ctx.arc(hx, hy, 2, 0, 6.2832); ctx.fill();
  }

  function draw(phase: number, tSec: number): void {
    const ctx = ctxRef.current;
    const az = azRef.current;
    const th = thRef.current;
    const PANEL = panelRef.current;
    const CA = caRef.current;
    const CT = ctRef.current;
    const HEAD = headRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !az || !th || !PANEL || !CA || !CT || !HEAD) return;

    ctx.fillStyle = rgba(PANEL, 1);
    ctx.fillRect(0, 0, W, H);

    const upto = Math.min(1, phase / REVEAL_END);
    const n = Math.floor(upto * steps);
    const fade = phase > REVEAL_END ? Math.max(0, 1 - (phase - REVEAL_END) / (1 - REVEAL_END)) : 1;
    // 관찰축 회전 — 사선 성분 tilt 를 진동시킨다
    const tilt = Math.sin(tSec / SPIN_L * 6.2832) * 0.5;

    const mid = W / 2;
    ctx.strokeStyle = rgba(CA, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mid, 0); ctx.lineTo(mid, H); ctx.stroke();

    drawPane(az.x, az.y, az.z, mid * 0.52, H * 0.52, Math.min(W / 46, H / 42) * 0.6, CA, HEAD, n, fade, tilt, ctx);
    drawPane(th.x, th.y, th.z, mid * 1.48, H * 0.5, Math.min(W / 46, H / 42) * 0.5, CT, HEAD, n, fade, tilt, ctx);

    ctx.textAlign = "center";
    ctx.fillStyle = rgba(CA, 0.9 * fade + 0.1);
    ctx.fillText("AIZAWA", mid * 0.52, H - 6);
    ctx.fillStyle = rgba(CT, 0.9 * fade + 0.1);
    ctx.fillText("THOMAS", mid * 1.48, H - 6);
  }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const tSec = (now - t0) / 1000;
    draw((tSec % spinS) / spinS, tSec);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    const cv = cvRef.current;
    if (!root || !cv) return;
    caRef.current = tokRGB(root, "--lz-ca");    // 아이자와 — 라일락 화이트
    ctRef.current = tokRGB(root, "--lz-ct");    // 토머스 — 민트 크림
    headRef.current = tokRGB(root, "--lz-head");// 머리 — 크림(토큰)
    panelRef.current = tokRGB(root, "--lz-panel");
    ctxRef.current = cv.getContext("2d");
    precompute(steps);
    fit();
    function onResize(): void {
      fit();
      if (reduced()) draw(0.62, 0.4);
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      draw(0.62, 0.4);
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
  }, [steps, spinS]);

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
