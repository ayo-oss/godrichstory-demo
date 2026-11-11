// FourierHeartDrawPath — vanilla 판(run/321/demo/04-fourier-heart-draw-path/index.html) 의 React 포트.
// 하트 그리기 — 03 의 DFT 파이프라인을 닫힌 매개변수 곡선에 다시 적용.
//   ① 하트 곡선 x=16sin³t, y=13cos t−5cos2t−2cos3t−cos4t 를 256 점 샘플링.
//   ② 같은 DFT 로 전체 계수를 구하고 크기 순 정렬, 상위 60개만 그린다(압축의 예고편, 08 슬라이더로 이어진다).
//   ③ 재합성 시 체인이 꼬리(뾰족한 아래 끝)에서 출발해 양쪽 볼록·중앙 오목까지 정확히 되짚는다.
// 붓끝이 하트를 다 그리면 트레일이 잠시 머물다 옅어지고 다시 그린다(루프).
// 화면이 사는 장치 — 방사 스윕 + 스포크가 매 프레임 재계산, 트레일은 투명 누적 캔버스(절대 clear 없음).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FourierHeartDrawPath.module.scss";

export type FourierHeartDrawPathProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;        // 경로 샘플 점 수
  show?: number;     // 화면에 그리는 원 개수
  hold?: number;     // 완성 후 머무는 비율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };

const FIELD_LABEL = "하트 그리기 에피사이클 실험판";
const TAU = Math.PI * 2;

// ── ① 하트 매개변수 곡선 ──
function heartPath(u: number): Pt {
  const t = u * TAU;
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x: x / 17, y: y / 17 };
}

// ── ② DFT ──
function dft(path: Pt[]): Coef[] {
  const M = path.length;
  const out: Coef[] = [];
  for (let k = 0; k < M; k++) {
    const freq = (k <= M / 2) ? k : k - M;
    let re = 0, im = 0;
    for (let n = 0; n < M; n++) {
      const a = -TAU * k * n / M;
      const c = Math.cos(a), s = Math.sin(a);
      re += path[n].x * c - path[n].y * s;
      im += path[n].x * s + path[n].y * c;
    }
    re /= M; im /= M;
    out.push({ freq: freq, re: re, im: im, amp: Math.sqrt(re * re + im * im) });
  }
  out.sort((a, b) => b.amp - a.amp);
  return out;
}

export default function FourierHeartDrawPath({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  n = 256,
  show = 60,
  hold = 0.4
}: FourierHeartDrawPathProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const trailCvRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const nRef = useRef(n) as Box<number>;
  const showRef = useRef(show) as Box<number>;
  const holdRef = useRef(hold) as Box<number>;
  const pathRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const coefRef = useRef<Coef[]>([]) as Box<Coef[]>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [cnt, setCnt] = useState("0");
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
    const trailCv = document.createElement("canvas");
    trailCv.width = W * dpr; trailCv.height = H * dpr;
    const trailCtx = trailCv.getContext("2d");
    if (trailCtx) trailCtx.scale(dpr, dpr);
    trailCvRef.current = trailCv;
    trailCtxRef.current = trailCtx;
    if (!pathRef.current.length) {
      const PATH: Pt[] = [];
      for (let i = 0; i < nRef.current; i++) PATH.push(heartPath(i / nRef.current));
      pathRef.current = PATH;
      coefRef.current = dft(PATH);
    }
  }

  function chainAt(u: number, showCount?: number): Pt[] {
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    const base = Math.min(W, H) * 0.42;
    const cx = W * 0.5, cy = H * 0.48;
    const pts: Pt[] = [{ x: cx, y: cy }];
    const n = showCount || COEF.length;
    for (let i = 0; i < n && i < COEF.length; i++) {
      const c = COEF[i];
      const a = c.freq * u * TAU;
      const ph = Math.atan2(c.im, c.re);
      const ang = a + ph;
      pts.push({ x: pts[i].x + Math.cos(ang) * c.amp * base, y: pts[i].y + Math.sin(ang) * c.amp * base });
    }
    return pts;
  }

  // 밑바탕 — 방사 스윕(계단 밴드) + 스포크. 하트의 대칭축과 어긋나게 돈다
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.48;
    const maxR = Math.sqrt(W * W + H * H) * 0.5;
    const sweep = t * 0.8;
    for (let b = 0; b < 18; b++) {
      ctx.fillStyle = rgba(col.glow, 0.09 * (1 - b / 18));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - (b + 1) * 0.055, sweep - b * 0.055);
      ctx.closePath();
      ctx.fill();
    }
    const spin = t * 0.24;
    for (let i = 0; i < 18; i++) {
      const a = spin + (i / 18) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.08 : 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      const rr = (Math.min(W, H) * 0.18) * k * (1 + 0.014 * Math.sin(t * 1.2 + k * 2));
      ctx.strokeStyle = rgba(col.glow, 0.06);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.stroke();
    }
  }

  function draw(u: number, pulse: number, showCount: number, gt: number): Pt {
    const ctx = ctxRef.current;
    const trailCv = trailCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    if (!ctx || !trailCv || !col) return { x: 0, y: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, gt);
    ctx.drawImage(trailCv, 0, 0, W, H);
    const base = Math.min(W, H) * 0.42;

    const pts = chainAt(u, showCount);
    for (let i = 0; i < pts.length - 1; i++) {
      const r = COEF[i].amp * base;
      if (r > 2) {
        ctx.strokeStyle = rgba(col.glow, 0.09 + 0.012 * i);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, r, 0, TAU);
        ctx.stroke();
      }
      if (i < 4 || r > 3) {
        ctx.strokeStyle = rgba(col.glow, 0.48);
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
        ctx.stroke();
      }
    }
    const pen = pts[pts.length - 1];
    const pr = 2.4 + pulse * 2.2;
    ctx.fillStyle = rgba(col.hot, 0.3);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, pr * 2.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(col.hot, 1);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, pr, 0, TAU);
    ctx.fill();
    return pen;
  }

  const prevPenRef = useRef<Pt | null>(null) as Box<Pt | null>;

  function stampTrail(pen: Pt): void {
    const trailCtx = trailCtxRef.current;
    const col = colRef.current;
    const prev = prevPenRef.current;
    if (!trailCtx || !col) return;
    if (!prev) { prevPenRef.current = pen; return; }
    trailCtx.strokeStyle = rgba(col.hot, 0.85);
    trailCtx.lineWidth = 1.9;
    trailCtx.lineCap = "round";
    trailCtx.beginPath();
    trailCtx.moveTo(prev.x, prev.y);
    trailCtx.lineTo(pen.x, pen.y);
    trailCtx.stroke();
    trailCtx.strokeStyle = rgba(col.hot, 0.12);
    trailCtx.lineWidth = 5;
    trailCtx.stroke();
    prevPenRef.current = pen;
  }

  function decayTrail(): void {
    const trailCtx = trailCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!trailCtx) return;
    trailCtx.setTransform(1, 0, 0, 1, 0, 0);
    trailCtx.globalCompositeOperation = "destination-out";
    trailCtx.fillStyle = "rgba(0,0,0,0.03)";
    trailCtx.fillRect(0, 0, W * dpr, H * dpr);
    trailCtx.globalCompositeOperation = "source-over";
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const wasHoldRef = useRef(false) as Box<boolean>;
  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const lt = ((now - t0) / 1000) * 0.45;
    const u = lt % 1;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 8.0);
    const PHASE_DRAW = 1 - holdRef.current;
    const inHold = u >= PHASE_DRAW;

    if (wasHoldRef.current && !inHold) prevPenRef.current = null;
    wasHoldRef.current = inHold;

    decayTrail();
    const pen = draw(inHold ? 1 : u / PHASE_DRAW, pulse, showRef.current, lt * TAU);
    if (!inHold) stampTrail(pen);
    setCnt(String(showRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  function stillFrame(): void {
    const S = showRef.current;
    let prev = chainAt(0, S)[S];
    for (let i = 1; i <= 200; i++) {
      const pen = chainAt(i / 200, S)[S];
      stampTrail(pen);
      prev = pen;
    }
    draw(1, 0.5, S, 2.1);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nRef.current = n;
    showRef.current = show;
    holdRef.current = hold;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
    setCnt(String(show));
    function onResize(): void {
      fit(); prevPenRef.current = null;
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
  }, [n, show, hold]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>하트 매개변수 곡선의 계수만 재합성하면 원 체인이 꼬리에서 시작해 하트의 오목한 부분까지 정확히 되짚어 가며, 사랑의 기하학이 계수 몇 개로 압축돼 있음을 보여줍니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{cnt}</b> 닫힌 곡선 · 상위 60개 원</span>
          <span className={styles.metaDim}>canvas · DFT · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
