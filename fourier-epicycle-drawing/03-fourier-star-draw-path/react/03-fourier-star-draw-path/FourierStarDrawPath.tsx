// FourierStarDrawPath — vanilla 판(run/321/demo/03-fourier-star-draw-path/index.html) 의 React 포트.
// 별 그리기 — 경로 점 → 이산 푸리에 변환(DFT) → 원 체인 재합성의 심장.
//   ① 별 윤곽을 매개변수 t(0~2π)로 256 점 샘플링해 복소평면 점으로 올린다.
//   ② DFT: c_k = (1/N)·Σ z_n · e^(-i·2πkn/N) — 모든 k(음수·양수 주파수)에 대해 계산.
//   ③ |c_k| 큰 순서로 정렬.
//   ④ 재합성: 시각 t 에 각 원이 중심 p += c_k·e^(i·k·t) 로 이어 붙는다. 맨 끝 = 원래 별 좌표.
// 붓끝이 별을 다 그리면 트레일이 잠시 머물렀다 옅어지고 다시 그린다(루프).
// 화면이 사는 장치 — 레이더 스윕·극격자가 매 프레임 재계산, 트레일은 투명 누적 캔버스(절대 clear 없음).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FourierStarDrawPath.module.scss";

export type FourierStarDrawPathProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;        // 경로 샘플 점 수
  show?: number;     // 화면에 그리는 원 개수(계수는 전부 사용)
  hold?: number;     // 완성 후 머무는 비율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };

const FIELD_LABEL = "별 그리기 에피사이클 실험판";
const TAU = Math.PI * 2;

// ── ① 별 윤곽 샘플 — 다섯 포인트 별(바깥·안 꼭짓점 교차) ──
function starPath(u: number): Pt {
  // u: 0~1. 외곽 반지름 1, 내곽 0.42. 열 개 꼭짓점을 지나는 닫힌 경로
  const seg = u * 10;
  const i = Math.floor(seg);
  const f = seg - i;
  const a1 = i / 10 * TAU - Math.PI / 2;
  const a2 = (i + 1) / 10 * TAU - Math.PI / 2;
  const r1 = (i % 2 === 0) ? 1 : 0.42;
  const r2 = (i % 2 === 0) ? 0.42 : 1;
  const x1 = Math.cos(a1) * r1, y1 = Math.sin(a1) * r1;
  const x2 = Math.cos(a2) * r2, y2 = Math.sin(a2) * r2;
  return { x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f };
}

// ── ② DFT ──
function dft(path: Pt[]): Coef[] {
  const M = path.length;
  const out: Coef[] = [];
  for (let k = 0; k < M; k++) {
    const freq = (k <= M / 2) ? k : k - M;   // 음수 주파수 접기
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
  out.sort((a, b) => b.amp - a.amp);   // ③ 크기 순
  return out;
}

export default function FourierStarDrawPath({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  n = 256,
  show = 14,
  hold = 0.45
}: FourierStarDrawPathProps) {
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
    // 경로·계수는 한 번만
    if (!pathRef.current.length) {
      const PATH: Pt[] = [];
      for (let i = 0; i < nRef.current; i++) PATH.push(starPath(i / nRef.current));
      pathRef.current = PATH;
      coefRef.current = dft(PATH);
    }
  }

  // ── ④ 재합성 — 시각 u(0~1)에서 체인 끝점 계산 ──
  function chainAt(u: number, showCount?: number): Pt[] {
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    const base = Math.min(W, H) * 0.4;
    const cx = W * 0.5, cy = H * 0.5;
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

  // 밑바탕 — 레이더 스윕 + 극격자. 매 프레임 재계산(누적 안 함).
  // 스윕은 스치는 부채꼴이 뒤로 갈수록 옅어지는 계단 밴드(그라디언트 아님 — 22단 알파).
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const sweep = t * 0.9;
    for (let b = 0; b < 22; b++) {
      ctx.fillStyle = rgba(col.glow, 0.09 * (1 - b / 22));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - (b + 1) * 0.05, sweep - b * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    // 스포크 20 — 별의 오른쪽 회전 방향과 어긋나게 돈다(양쪽 알파 모두 문턱 위)
    const spin = -t * 0.3;
    for (let i = 0; i < 20; i++) {
      const a = spin + (i / 20) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.075 : 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    for (let k = 1; k <= 3; k++) {
      const rr = (Math.min(W, H) * 0.2) * k * (1 + 0.014 * Math.sin(t * 1.1 + k * 2));
      ctx.strokeStyle = rgba(col.glow, 0.055);
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
    const base = Math.min(W, H) * 0.4;

    const pts = chainAt(u, showCount);
    for (let i = 0; i < pts.length - 1; i++) {
      const r = COEF[i].amp * base;
      if (r > 2) {
        ctx.strokeStyle = rgba(col.glow, 0.1 + 0.02 * i);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, r, 0, TAU);
        ctx.stroke();
      }
      if (i < 3 || r > 3) {
        ctx.strokeStyle = rgba(col.glow, 0.5);
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
    trailCtx.strokeStyle = rgba(col.glow, 0.9);
    trailCtx.lineWidth = 1.9;
    trailCtx.lineCap = "round";
    trailCtx.beginPath();
    trailCtx.moveTo(prev.x, prev.y);
    trailCtx.lineTo(pen.x, pen.y);
    trailCtx.stroke();
    trailCtx.strokeStyle = rgba(col.glow, 0.14);
    trailCtx.lineWidth = 5;
    trailCtx.stroke();
    prevPenRef.current = pen;
  }

  // 혜성 감쇠 — 투명 트레일 캔버스를 매 프레임 조금씩 지운다(절대 opaque fillRect 없음)
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
    const lt = ((now - t0) / 1000) * 0.5;   // 한 바퀴 2초
    const u = lt % 1;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 8.0);
    const PHASE_DRAW = 1 - holdRef.current;
    const inHold = u >= PHASE_DRAW;

    if (wasHoldRef.current && !inHold) prevPenRef.current = null;   // 머문 뒤 다음 그리기 사이클 시작점 재동기화
    wasHoldRef.current = inHold;

    decayTrail();
    const pen = draw(inHold ? 1 : u / PHASE_DRAW, pulse, showRef.current, lt * TAU);
    if (!inHold) stampTrail(pen);
    setCnt(String(nRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  function stillFrame(): void {
    // reduce — 별 한 바퀴 궤적을 미리 쌓은 뒤 완성 장면을 고정한다
    const COEF = coefRef.current;
    const S = showRef.current;
    let prev = chainAt(0)[COEF.length - 1];
    for (let i = 1; i <= 200; i++) {
      const pen = chainAt(i / 200)[COEF.length - 1];
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
    setCnt(String(n));
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
          <span>별 윤곽의 점들을 이산 푸리에 변환해 크기 순으로 원을 배열하면 붓끝이 별의 꼭짓점을 놓치지 않고 한 바퀴 돌아 원래 별을 재현합니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{cnt}</b> 점 256개 · 계수 크기 순 정렬</span>
          <span className={styles.metaDim}>canvas · DFT · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
