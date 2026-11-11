// EpicycleChainBasic — vanilla 판(run/321/demo/01-fourier-epicycle-chain-basic/index.html) 의 React 포트.
// 기본 에피사이클 체인. 푸리에 재합성의 최소 단위 — 계수열 coef[k] = (반지름, 시작 위상) 을
// 직접 정의하고 주파수 k 배로 도는 원들을 앞 원의 끝점을 다음 원의 중심으로 삼아 이어 붙인다.
// 맨 끝점(펜)의 자리가 원운동의 합 f(t) = Σ r_k · e^(i(k·t + φ_k)) 이다.
// 화면이 사는 장치 — 극격자(회전 스포크·동심원)가 매 프레임 다시 그려지고,
// 궤적은 투명 누적 캔버스에 쌓여 혜성 꼬리처럼 감쇠한다(절대 clear 하지 않는다).
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EpicycleChainBasic.module.scss";

export type EpicycleChainBasicProps = {
  duration?: string;
  easing?: string;
  color?: string;
  speed?: number;   // 회전 속도(배) — 변형 "시간 속도"가 이 값을 1→3 으로 바꾼다
  terms?: number;   // 체인에 얹는 계수(원) 개수
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { k: number; r: number; p: number };

const FIELD_LABEL = "기본 에피사이클 체인 실험판";

// 계수 5개 — 주파수 2·3·5·7·9, 위상을 어긋나게 잡아 꽃잎 대칭이 나오게 한다
const COEF: Coef[] = [
  { k: 2, r: 0.34, p: 0.0 },
  { k: 3, r: 0.18, p: 1.1 },
  { k: 5, r: 0.12, p: 2.4 },
  { k: 7, r: 0.07, p: 0.6 },
  { k: 9, r: 0.05, p: 3.6 }
];

export default function EpicycleChainBasic({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  speed = 1.0,
  terms = 5
}: EpicycleChainBasicProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const chainCvRef = useRef<HTMLCanvasElement | null>(null);
  const chainCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const speedRef = useRef(speed) as Box<number>;
  const termsRef = useRef(terms) as Box<number>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState("0");
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
    const chainCv = document.createElement("canvas");
    chainCv.width = W * dpr; chainCv.height = H * dpr;
    const chainCtx = chainCv.getContext("2d");
    if (chainCtx) chainCtx.scale(dpr, dpr);
    chainCvRef.current = chainCv;
    chainCtxRef.current = chainCtx;
  }

  // 계수 체인을 t 각도로 돌려 펜 위치까지의 중심·반지름 배열을 계산한다
  function computeChain(t: number): Pt[] {
    const W = wRef.current, H = hRef.current;
    const cx = W * 0.5, cy = H * 0.5;
    const base = Math.min(W, H) * 0.48;
    const pts: Pt[] = [{ x: cx, y: cy }];
    const T = termsRef.current;
    for (let i = 0; i < T && i < COEF.length; i++) {
      const c = COEF[i];
      const a = c.k * t + c.p;
      pts.push({ x: pts[i].x + Math.cos(a) * c.r * base, y: pts[i].y + Math.sin(a) * c.r * base });
    }
    return pts;
  }

  // 밑바탕 극격자 — 매 프레임 계산해 다시 그린다(절대 누적 안 함). 천천히 도는 스포크 16개 + 동심원
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const spin = t * 0.09;
    for (let i = 0; i < 16; i++) {
      const a = spin + (i / 16) * Math.PI * 2;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.075 : 0.038);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    for (let k = 1; k <= 4; k++) {
      const rr = (Math.min(W, H) * 0.14) * k * (1 + 0.012 * Math.sin(t * 1.3 + k));
      ctx.strokeStyle = rgba(col.glow, 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawFrame(t: number, penPulse: number): Pt {
    const ctx = ctxRef.current;
    const chainCv = chainCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    const pts: Pt[] = [];
    if (!ctx || !chainCv || !col) return { x: 0, y: 0 };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGrid(ctx, t);
    ctx.drawImage(chainCv, 0, 0, W, H);

    const chain = computeChain(t);
    const base = Math.min(W, H) * 0.48;

    // 원 체인 — 링은 옅게, 링크는 주색
    ctx.lineWidth = 1;
    for (let i = 0; i < chain.length - 1; i++) {
      const r = COEF[i].r * base;
      ctx.strokeStyle = rgba(col.glow, 0.16 + 0.05 * i);
      ctx.beginPath();
      ctx.arc(chain[i].x, chain[i].y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(col.glow, 0.55);
      ctx.beginPath();
      ctx.moveTo(chain[i].x, chain[i].y);
      ctx.lineTo(chain[i + 1].x, chain[i + 1].y);
      ctx.stroke();
      ctx.fillStyle = rgba(col.glow, 0.8);
      ctx.beginPath();
      ctx.arc(chain[i].x, chain[i].y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    pts.push(chain[chain.length - 1]);

    // 펜 — 맥동하는 절정 점
    const pen = pts[pts.length - 1];
    const pr = 2.6 + penPulse * 2.4;
    ctx.fillStyle = rgba(col.hot, 0.28);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, pr * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(col.hot, 1);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, pr, 0, Math.PI * 2);
    ctx.fill();
    return pen;
  }

  function stampPen(pen: Pt, prev: Pt): void {
    // 궤적 누적 — 펜이 지나간 자리를 주색으로 쌓는다(두꺼운 선 + 옅은 확장)
    const chainCtx = chainCtxRef.current;
    const col = colRef.current;
    if (!chainCtx || !col) return;
    chainCtx.strokeStyle = rgba(col.glow, 0.85);
    chainCtx.lineWidth = 1.8;
    chainCtx.lineCap = "round";
    chainCtx.beginPath();
    chainCtx.moveTo(prev.x, prev.y);
    chainCtx.lineTo(pen.x, pen.y);
    chainCtx.stroke();
    chainCtx.strokeStyle = rgba(col.glow, 0.2);
    chainCtx.lineWidth = 4.4;
    chainCtx.stroke();
  }

  function decayTrail(): void {
    // 혜성 감쇠 — 투명 궤적 캔버스를 매 프레임 조금씩 지운다
    const chainCtx = chainCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!chainCtx) return;
    chainCtx.setTransform(1, 0, 0, 1, 0, 0);
    chainCtx.globalCompositeOperation = "destination-out";
    chainCtx.fillStyle = "rgba(0,0,0,0.028)";
    chainCtx.fillRect(0, 0, W * dpr, H * dpr);
    chainCtx.globalCompositeOperation = "source-over";
    chainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function stillFrame(): void {
    // reduce — 궤적을 미리 한 바퀴 쌓은 뒤 마지막 장면을 고정한다
    const ctx = ctxRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !col) return;
    const T = termsRef.current;
    let prev = computeChain(0)[T];
    for (let i = 1; i <= 240; i++) {
      const tt = (i / 240) * Math.PI * 2;
      const pen = computeChain(tt)[T];
      stampPen(pen, prev);
      prev = pen;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    drawFrame(2.1, 0.5);
  }

  const prevPenRef = useRef<Pt | null>(null) as Box<Pt | null>;
  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) { t0 = now; prevPenRef.current = null; }
    const t = ((now - t0) / 1000) * speedRef.current;
    const pulse = 0.5 + 0.5 * Math.sin(t * 9.0);
    decayTrail();
    const pen = drawFrame(t, pulse);
    if (prevPenRef.current) stampPen(pen, prevPenRef.current);
    prevPenRef.current = pen;
    setN(String(termsRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    speedRef.current = speed;
    termsRef.current = terms;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
    setN(String(terms));
    function onResize(): void {
      fit();
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
  }, [speed, terms]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>미리 정의한 복소 계수 몇 개로 반지름이 점점 작아지는 원들을 차례로 이어 붙이면, 맨 끝점이 평면에 꽃잎 같은 대칭 무늬를 그리며 도는데 이것이 푸리에 재합성의 최소 단위입니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b> 배음 5개 · 계수 직접 정의</span>
          <span className={styles.metaDim}>canvas · complex chain · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
