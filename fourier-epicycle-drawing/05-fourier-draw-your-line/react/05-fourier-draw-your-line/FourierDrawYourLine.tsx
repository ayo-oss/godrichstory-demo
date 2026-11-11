// FourierDrawYourLine — vanilla 판(run/321/demo/05-fourier-draw-your-line/index.html) 의 React 포트.
// 내 선 그리기 — 편의 인터랙티브 축. 손으로 그은 선이 그대로 DFT 입력이 된다.
//   ① 기본 상태: 예시 낙서(물결 서명)를 낮은 알파로 깔아두고 에피사이클이 반복해서 되그린다.
//   ② pointerdown~move 로 점을 모으면(최대 512) 기존 계수를 지우고 즉시 dft() 재계산 —
//     계산은 O(N²) 이지만 N=512 로 순식간이고, 체인이 새 경로를 다시 그리기 시작한다.
//   ③ 같은 재합성 루프(투명 트레일 누적 + 혜성 감쇠)를 공유한다.
// 화면이 사는 장치 — 밑바탕 방사 스윕·스포크가 매 프레임 재계산,
// 손 궤적(입력)도 옅은 잔상으로 함께 남는다 — 그은 즉시 바뀌는 계수를 눈으로 읽는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./FourierDrawYourLine.module.scss";

export type FourierDrawYourLineProps = {
  duration?: string;
  easing?: string;
  color?: string;
  maxPts?: number;   // 입력 받는 최대 점 수
  show?: number;     // 화면에 그리는 원 개수
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };

const FIELD_LABEL = "내 선 그리기 에피사이클 실험판";
const TAU = Math.PI * 2;

// ── DFT (03·04 와 같은 계산) ──
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

export default function FourierDrawYourLine({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  maxPts = 512,
  show = 48
}: FourierDrawYourLineProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const trailCvRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const handCvRef = useRef<HTMLCanvasElement | null>(null);
  const handCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const maxPtsRef = useRef(maxPts) as Box<number>;
  const showRef = useRef(show) as Box<number>;
  const pathRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const normPathRef = useRef<Pt[]>([]) as Box<Pt[]>;   // 정규화된 경로(체인 재현용)
  const coefRef = useRef<Coef[]>([]) as Box<Coef[]>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const drawingRef = useRef(false) as Box<boolean>;
  const lastPtRef = useRef<Pt | null>(null) as Box<Pt | null>;
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

  function normalize(): void {
    // 그은 점을 무대 중심·단위반지름으로 정규화
    const PATH = pathRef.current;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let i = 0; i < PATH.length; i++) {
      if (PATH[i].x < minx) minx = PATH[i].x;
      if (PATH[i].x > maxx) maxx = PATH[i].x;
      if (PATH[i].y < miny) miny = PATH[i].y;
      if (PATH[i].y > maxy) maxy = PATH[i].y;
    }
    const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
    const span = Math.max(maxx - minx, maxy - miny) || 1;
    const norm: Pt[] = [];
    for (let j = 0; j < PATH.length; j++) {
      norm.push({ x: (PATH[j].x - cx) / span, y: (PATH[j].y - cy) / span });
    }
    normPathRef.current = norm;
    coefRef.current = dft(norm);
  }

  function sampleDoodle(): void {
    // 예시 낙서 — 서명 같은 물결. t 0~1 로 닫힌 물결 무늬
    const PATH: Pt[] = [];
    for (let i = 0; i < 200; i++) {
      const t = i / 200;
      PATH.push({
        x: Math.cos(t * TAU) * (0.36 + 0.16 * Math.sin(t * TAU * 3)),
        y: Math.sin(t * TAU) * (0.24 + 0.12 * Math.cos(t * TAU * 2))
      });
    }
    pathRef.current = PATH;
    normalize();
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
    handCvRef.current = null;
    handCtxRef.current = null;
    if (!coefRef.current.length) sampleDoodle();
  }

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

  // 밑바탕 — 방사 스윕(계단 밴드) + 스포크
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(W * W + H * H) * 0.5;
    const sweep = t * 1.1;
    for (let b = 0; b < 16; b++) {
      ctx.fillStyle = rgba(col.glow, 0.085 * (1 - b / 16));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - (b + 1) * 0.06, sweep - b * 0.06);
      ctx.closePath();
      ctx.fill();
    }
    const spin = t * 0.26;
    for (let i = 0; i < 16; i++) {
      const a = spin + (i / 16) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.08 : 0.05);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
  }

  function draw(u: number, pulse: number, showCount: number, gt: number): Pt {
    const ctx = ctxRef.current;
    const trailCv = trailCvRef.current;
    const handCv = handCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    if (!ctx || !trailCv || !col) return { x: 0, y: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, gt);
    // 손 궤적 잔상 — 사용자가 그은 원본(정규화 전 화면 좌표)을 옅게
    if (handCv) ctx.drawImage(handCv, 0, 0, W, H);
    ctx.drawImage(trailCv, 0, 0, W, H);
    const base = Math.min(W, H) * 0.4;

    const pts = chainAt(u, showCount);
    for (let i = 0; i < pts.length - 1; i++) {
      const r = COEF[i].amp * base;
      if (r > 2) {
        ctx.strokeStyle = rgba(col.glow, 0.09 + 0.01 * i);
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
    trailCtx.strokeStyle = rgba(col.glow, 0.88);
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

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const lt = ((now - t0) / 1000) * 0.5;
    const u = lt % 1;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 8.0);
    decayTrail();
    const pen = draw(u, pulse, showRef.current, lt * TAU);
    stampTrail(pen);
    setCnt(String(pathRef.current.length));
    rafRef.current = requestAnimationFrame(frame);
  }

  // ── 입력 — 그으면 즉시 DFT 재계산 ──
  function toField(e: ReactPointerEvent<HTMLCanvasElement>): Pt {
    const cv = cvRef.current;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function startDraw(e: ReactPointerEvent<HTMLCanvasElement>): void {
    const col = colRef.current;
    const W = wRef.current, H = hRef.current;
    const dpr = dprRef.current;
    if (!col) return;
    drawingRef.current = true;
    const p = toField(e);
    lastPtRef.current = p;
    pathRef.current = [p];
    if (!handCvRef.current) {
      const handCv = document.createElement("canvas");
      handCv.width = W * dpr; handCv.height = H * dpr;
      const handCtx = handCv.getContext("2d");
      if (handCtx) handCtx.scale(dpr, dpr);
      handCvRef.current = handCv;
      handCtxRef.current = handCtx;
    }
    const handCtx = handCtxRef.current;
    if (handCtx) handCtx.clearRect(0, 0, W, H);
    prevPenRef.current = null;
    e.preventDefault();
  }
  function moveDraw(e: ReactPointerEvent<HTMLCanvasElement>): void {
    const handCtx = handCtxRef.current;
    const col = colRef.current;
    const last = lastPtRef.current;
    if (!drawingRef.current || !handCtx || !col || !last) return;
    const p = toField(e);
    if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 4) return;
    pathRef.current.push(p);
    if (pathRef.current.length > maxPtsRef.current) pathRef.current.shift();
    handCtx.strokeStyle = rgba(col.hot, 0.28);
    handCtx.lineWidth = 2;
    handCtx.lineCap = "round";
    handCtx.beginPath();
    handCtx.moveTo(last.x, last.y);
    handCtx.lineTo(p.x, p.y);
    handCtx.stroke();
    lastPtRef.current = p;
    normalize();
    prevPenRef.current = null;
    e.preventDefault();
  }
  function endDraw(): void {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (pathRef.current.length > 8) normalize();
  }

  function stillFrame(): void {
    const S = showRef.current;
    let prev = chainAt(0, S)[S];
    for (let i = 1; i <= 200; i++) {
      const pen = chainAt(i / 200, S)[S];
      stampTrail(pen);
      prev = pen;
    }
    draw(0.5, 0.5, S, 2.1);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    maxPtsRef.current = maxPts;
    showRef.current = show;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
    setCnt(String(pathRef.current.length));
    function onResize(): void {
      fit(); prevPenRef.current = null;
      if (reduced()) stillFrame();
    }
    function onPointerUp(): void {
      endDraw();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("pointerup", onPointerUp);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      t0 = -1;
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerup", onPointerUp);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxPts, show]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>캔버스에 마우스로 아무 선이나 그으면 그 점들이 즉시 복소 계수로 바뀌어, 방금 손으로 그은 서명 낙서를 에피사이클이 한 획씩 다시 그려줍니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas
            className={styles.cv}
            ref={cvRef}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
          ></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{cnt}</b> 예시 낙서 · 직접 그려 보세요</span>
          <span className={styles.metaDim}>canvas · live DFT · pointer events</span>
        </div>
      </div>
    </main>
  );
}
