// FourierLogoTraceScene — vanilla 판(run/321/demo/09-fourier-logo-trace-scene/index.html) 의 React 포트.
// 로고 트레이스 씬 — 편의 마무리. DFT 재합성을 "브랜드 공개" 장면으로 연출한다.
//   ① 로고 윤곽: G 의 원호 + 가로획으로 이루어진 한 획 경로를 매개변수 점열로 정의한다.
//   ② 03·04 와 같은 DFT → 체인 재합성으로 붓끝이 윤곽을 되그린다.
//   ③ 연출 — 중앙 스포트라이트(계단 밴드 동심원 + 방사 그라디언트 조명)가 천천히 돌고,
//     붓끝에 하이라이트 절정 점. 한 바퀴를 그린 뒤엔 체인이 잠시 사라지고 잔상 트레일만 남는다.
// 화면이 사는 장치 — 스포트라이트 동심원·스포크가 매 프레임 재계산,
// 트레일은 투명 캔버스에 쌓이고 아주 느리게 감쇠(잔상 유지가 컨셉). 머무는 단계에서도 숨쉰다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FourierLogoTraceScene.module.scss";

export type FourierLogoTraceSceneProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;        // 경로 샘플 수
  show?: number;     // 체인에 그리는 원 개수
  hold?: number;     // 완성 후 잔상만 머무는 비율
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };

const FIELD_LABEL = "로고 트레이스 씬 실험판";
const TAU = Math.PI * 2;

// ── ① 로고 윤곽 — "G" 한 획. 원호 300도 + 안쪽으로 꺾여 가로획 ──
function logoPath(u: number): Pt {
  // 0~0.72: 원호(각도 -60도에서 240도 방향으로), 0.72~1: 가로획
  const ARC = 0.72;
  const R = 1;
  if (u < ARC) {
    const ang = (-Math.PI / 6) + (u / ARC) * (TAU * 300 / 360) * -1;
    return { x: Math.cos(ang) * R * 0.62, y: Math.sin(ang) * R * 0.62 };
  }
  const f = (u - ARC) / (1 - ARC);
  const sx = Math.cos(-Math.PI / 6) * 0.62, sy = Math.sin(-Math.PI / 6) * 0.62;
  const ex = 0.42, ey = 0.02;
  return { x: sx + (ex - sx) * f, y: sy + (ey - sy) * f };
}

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

export default function FourierLogoTraceScene({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  n = 256,
  show = 36,
  hold = 0.35
}: FourierLogoTraceSceneProps) {
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
      for (let i = 0; i < nRef.current; i++) PATH.push(logoPath(i / nRef.current));
      pathRef.current = PATH;
      coefRef.current = dft(PATH);
    }
  }

  function chainAt(u: number, showCount: number): Pt[] {
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    const base = Math.min(W, H) * 0.4;
    const cx = W * 0.5, cy = H * 0.5;
    const pts: Pt[] = [{ x: cx, y: cy }];
    for (let i = 0; i < showCount && i < COEF.length; i++) {
      const c = COEF[i];
      const ph = Math.atan2(c.im, c.re);
      const ang = c.freq * u * TAU + ph;
      pts.push({
        x: pts[i].x + Math.cos(ang) * c.amp * base,
        y: pts[i].y + Math.sin(ang) * c.amp * base
      });
    }
    return pts;
  }

  // 중앙 스포트라이트 — 레이더 스윕(계단 밴드) + createRadialGradient 조명 + 동심원 + 스포크
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(W * W + H * H) * 0.5;
    // 스포트라이트 조명 — 중앙이 밝고 가장자리로 어두워지는 방사 그라디언트(브랜드 공개 무대)
    const spot = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.08, cx, cy, maxR);
    spot.addColorStop(0, rgba(col.glow, 0.1));
    spot.addColorStop(0.45, rgba(col.glow, 0.03));
    spot.addColorStop(1, rgba(col.ink, 0));
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, W, H);
    // 레이더 스윕 — 스치는 부채꼴이 뒤로 갈수록 옅어지는 계단 밴드 20단
    const sweep = t * 0.9;
    for (let b = 0; b < 20; b++) {
      ctx.fillStyle = rgba(col.glow, 0.1 * (1 - b / 20));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - (b + 1) * 0.05, sweep - b * 0.05);
      ctx.closePath();
      ctx.fill();
    }
    // 동심원 8 — 반지름이 숨쉬고 알파도 계단으로 감쇠
    for (let ring = 1; ring <= 8; ring++) {
      const rr = (maxR * 0.16) * ring * (1 + 0.02 * Math.sin(t * 1.1 + ring * 1.3));
      ctx.strokeStyle = rgba(col.glow, 0.12 * (1 - ring / 9));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, TAU);
      ctx.stroke();
    }
    // 스포크 18 — 천천히 돈다
    const spin = t * 0.28;
    for (let i = 0; i < 18; i++) {
      const a = spin + (i / 18) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.1 : 0.06);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
  }

  function draw(u: number, pulse: number, showCount: number, gt: number, showChain: boolean): Pt | null {
    const ctx = ctxRef.current;
    const trailCv = trailCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    if (!ctx || !trailCv || !col) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, gt);
    ctx.drawImage(trailCv, 0, 0, W, H);
    const base = Math.min(W, H) * 0.4;

    let pen: Pt | null = null;
    if (showChain) {
      const pts = chainAt(u, showCount);
      for (let i = 0; i < pts.length - 1; i++) {
        const r = COEF[i].amp * base;
        if (r > 2) {
          ctx.strokeStyle = rgba(col.glow, 0.09 + 0.008 * i);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, r, 0, TAU);
          ctx.stroke();
        }
        if (i < 4 || r > 3) {
          ctx.strokeStyle = rgba(col.glow, 0.5);
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
          ctx.stroke();
        }
      }
      pen = pts[pts.length - 1];
      const pr = 2.6 + pulse * 2.4;
      ctx.fillStyle = rgba(col.hot, 0.32);
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, pr * 2.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(col.hot, 1);
      ctx.beginPath();
      ctx.arc(pen.x, pen.y, pr, 0, TAU);
      ctx.fill();
    }
    return pen;
  }

  const prevPenRef = useRef<Pt | null>(null) as Box<Pt | null>;

  function stampTrail(pen: Pt): void {
    const trailCtx = trailCtxRef.current;
    const col = colRef.current;
    const prev = prevPenRef.current;
    if (!trailCtx || !col) return;
    if (!prev) { prevPenRef.current = pen; return; }
    trailCtx.strokeStyle = rgba(col.hot, 0.92);
    trailCtx.lineWidth = 2.1;
    trailCtx.lineCap = "round";
    trailCtx.beginPath();
    trailCtx.moveTo(prev.x, prev.y);
    trailCtx.lineTo(pen.x, pen.y);
    trailCtx.stroke();
    trailCtx.strokeStyle = rgba(col.hot, 0.14);
    trailCtx.lineWidth = 5.4;
    trailCtx.stroke();
    prevPenRef.current = pen;
  }

  // 잔상 유지 — 감쇠가 아주 느리다(컨셉: 머무는 잔상)
  function decayTrail(): void {
    const trailCtx = trailCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!trailCtx) return;
    trailCtx.setTransform(1, 0, 0, 1, 0, 0);
    trailCtx.globalCompositeOperation = "destination-out";
    trailCtx.fillStyle = "rgba(0,0,0,0.012)";
    trailCtx.fillRect(0, 0, W * dpr, H * dpr);
    trailCtx.globalCompositeOperation = "source-over";
    trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const wasHoldRef = useRef(false) as Box<boolean>;
  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const lt = ((now - t0) / 1000) * 0.5;
    const u = lt % 1;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 7.0);
    const PHASE_DRAW = 1 - holdRef.current;
    const inHold = u >= PHASE_DRAW;

    if (wasHoldRef.current && !inHold) prevPenRef.current = null;
    wasHoldRef.current = inHold;

    decayTrail();
    if (!inHold) {
      const pen = draw(u / PHASE_DRAW, pulse, showRef.current, lt * TAU, true);
      if (pen) stampTrail(pen);
    } else {
      // 머무는 단계 — 체인은 물러나고 잔상만
      draw(1, pulse, showRef.current, lt * TAU, false);
    }
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
    draw(1, 0.5, S, 2.1, false);
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
          <span>검은 배경에 중앙 조명을 깔고 에피사이클 체인이 로고 윤곽을 한 획으로 되그리는 장면을 만들면, 원들의 회전이 멈춰도 잔상 트레일이 남아 브랜드 공개에 쓸 한 장면이 됩니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{cnt}</b> 한 획 · 잔상 유지 조명</span>
          <span className={styles.metaDim}>canvas · brand reveal · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
