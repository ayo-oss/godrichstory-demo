// SquareWaveSynth — vanilla 판(run/321/demo/02-fourier-square-wave-synth/index.html) 의 React 포트.
// 구형파 합성. 푸리에 급수의 고전 증명 장면 — 구형파는 홀수 배음만 남긴 코사인 급수
// f(t) = (4/π)·Σ_{k 홀수} sin(k t)/k 로 분해된다. 각 항 sin(k t)/k 는 반지름 1/k 인 원이
// k 배속으로 도는 것과 같다(오일러 공식의 허수부). 왼쪽에서 그 원 체인을 세로로 쌓으면
// 맨 끝점의 높이가 f(t) — 오른쪽 파형 영역에 t 축으로 펼쳐 쌓는다.
// 화면이 사는 장치 — 왼쪽 체인 뒤 극격자 스포크가 천천히 돌고 오른쪽 파형 영역에
// 시간 눈금·스캔 밴드가 흐른다(매 프레임 재계산). 파형은 투명 누적 캔버스에 쌓이고 혜성 감쇠.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SquareWaveSynth.module.scss";

export type SquareWaveSynthProps = {
  duration?: string;
  easing?: string;
  color?: string;
  terms?: number;   // 사용할 홀수 배음 개수 (1·3·5·7차)
  speed?: number;   // 시간 전진 속도
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };

const FIELD_LABEL = "구형파 합성 실험판";
const AMP = 1.2732395;  // 4/π — 구형파 진폭 정규화

export default function SquareWaveSynth({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  terms = 4,
  speed = 0.55
}: SquareWaveSynthProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const waveCvRef = useRef<HTMLCanvasElement | null>(null);
  const waveCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const termsRef = useRef(terms) as Box<number>;
  const speedRef = useRef(speed) as Box<number>;
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
    const waveCv = document.createElement("canvas");
    waveCv.width = W * dpr; waveCv.height = H * dpr;
    const waveCtx = waveCv.getContext("2d");
    if (waveCtx) waveCtx.scale(dpr, dpr);
    waveCvRef.current = waveCv;
    waveCtxRef.current = waveCtx;
  }

  // 밑바탕 — 왼쪽 극격자(회전 스포크) + 오른쪽 흐르는 시간 눈금 + 스캔 밴드. 매 프레임 재계산
  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.24, cy = H * 0.5;
    const maxR = Math.min(W, H) * 0.52;
    const spin = t * 0.3;
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * Math.PI * 2;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.12 : 0.06);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    // 오른쪽 시간 눈금 — 세로선이 왼쪽으로 흐른다
    const x0 = W * 0.46;
    const flow = (t * 26) % 24;
    for (let x = x0 + flow; x < W; x += 24) {
      ctx.strokeStyle = rgba(col.glow, 0.082);
      ctx.beginPath();
      ctx.moveTo(x, 4); ctx.lineTo(x, H - 4);
      ctx.stroke();
    }
    // 스캔 밴드 — 파형 영역을 가로질러 흐르는 계단 밴드(그라디언트 아님 — 12단)
    const bx = W * 0.46 + ((t * 60) % (W * 0.58));
    for (let sb = 0; sb < 12; sb++) {
      ctx.fillStyle = rgba(col.glow, 0.095 * (1 - sb / 12));
      ctx.fillRect(bx - sb * 6, 0, 6, H);
    }
    // 기준 레벨선(진폭 ±1) — 숨쉰다
    ctx.strokeStyle = rgba(col.glow, 0.09 + 0.03 * Math.sin(t * 1.7));
    ctx.beginPath();
    ctx.moveTo(W * 0.44, cy - H * 0.36); ctx.lineTo(W, cy - H * 0.36);
    ctx.moveTo(W * 0.44, cy + H * 0.36); ctx.lineTo(W, cy + H * 0.36);
    ctx.stroke();
  }

  function computeChain(t: number): Pt[] {
    // 세로 스택: 원 k 반지름 = AMP/k, 각속도 = k
    const W = wRef.current, H = hRef.current;
    const pts: Pt[] = [];
    const cx = W * 0.24, cy = H * 0.5;
    const base = H * 0.36;
    pts.push({ x: cx, y: cy });
    for (let k = 1; k <= termsRef.current * 2; k += 2) {
      const y = pts[pts.length - 1].y + Math.sin(k * t) * (AMP / k) * base;
      pts.push({ x: cx, y: y });
    }
    return pts;
  }

  function draw(t: number, pulse: number): number {
    const ctx = ctxRef.current;
    const waveCv = waveCvRef.current;
    const col = colRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!ctx || !waveCv || !col) return 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgb(" + col.ink[0] + "," + col.ink[1] + "," + col.ink[2] + ")";
    ctx.fillRect(0, 0, W, H);
    drawGrid(ctx, t);
    ctx.drawImage(waveCv, 0, 0, W, H);

    const pts = computeChain(t);
    const base = H * 0.36;
    const cx = W * 0.24;

    // 파형 영역 구분선
    ctx.strokeStyle = rgba(col.glow, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W * 0.42, 0); ctx.lineTo(W * 0.42, H);
    ctx.stroke();

    // 원 체인(세로 스택)
    for (let i = 0; i < pts.length - 1; i++) {
      const k = i * 2 + 1;
      const r = (AMP / k) * base;
      ctx.strokeStyle = rgba(col.glow, 0.15 + 0.06 * i);
      ctx.beginPath();
      ctx.arc(cx, pts[i].y, Math.abs(r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = rgba(col.glow, 0.6);
      ctx.beginPath();
      ctx.moveTo(cx, pts[i].y);
      ctx.lineTo(cx, pts[i + 1].y);
      ctx.stroke();
    }

    const penY = pts[pts.length - 1].y;

    // 펜 → 파형 절정을 잇는 가이드 수평선
    ctx.strokeStyle = rgba(col.hot, 0.4);
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(cx + 4, penY);
    ctx.lineTo(W * 0.46, penY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 파형의 현재 끝점 — 맥동 절정 점
    let wx = W * 0.46 + (t * W * 0.5) % (W * 0.5);
    if (wx > W - 3) wx = W - 3;
    const pr = 2.4 + pulse * 2.2;
    ctx.fillStyle = rgba(col.hot, 0.3);
    ctx.beginPath();
    ctx.arc(wx, penY, pr * 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(col.hot, 1);
    ctx.beginPath();
    ctx.arc(wx, penY, pr, 0, Math.PI * 2);
    ctx.fill();
    return penY;
  }

  function stampWave(penY: number, prevY: number | null, t: number): void {
    const waveCtx = waveCtxRef.current;
    const col = colRef.current;
    const W = wRef.current;
    if (!waveCtx || !col) return;
    const wx = W * 0.46 + (t * W * 0.5) % (W * 0.5);
    if (wx > W - 3) return;
    const py = prevY === null ? penY : prevY;
    waveCtx.strokeStyle = rgba(col.glow, 0.85);
    waveCtx.lineWidth = 1.8;
    waveCtx.lineCap = "round";
    waveCtx.beginPath();
    waveCtx.moveTo(wx - W * 0.5 * speedRef.current * (1 / 60), py);
    waveCtx.lineTo(wx, penY);
    waveCtx.stroke();
    waveCtx.strokeStyle = rgba(col.glow, 0.18);
    waveCtx.lineWidth = 4.8;
    waveCtx.stroke();
  }

  function decayWave(): void {
    const waveCtx = waveCtxRef.current;
    const dpr = dprRef.current;
    const W = wRef.current, H = hRef.current;
    if (!waveCtx) return;
    waveCtx.setTransform(1, 0, 0, 1, 0, 0);
    waveCtx.globalCompositeOperation = "destination-out";
    waveCtx.fillStyle = "rgba(0,0,0,0.02)";
    waveCtx.fillRect(0, 0, W * dpr, H * dpr);
    waveCtx.globalCompositeOperation = "source-over";
    waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const prevYRef = useRef<number | null>(null) as Box<number | null>;
  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = ((now - t0) / 1000) * speedRef.current * 4.2;
    const pulse = 0.5 + 0.5 * Math.sin(t * 7.0);
    decayWave();
    const penY = draw(t, pulse);
    stampWave(penY, prevYRef.current, t);
    prevYRef.current = penY;
    setN(String(termsRef.current));
    rafRef.current = requestAnimationFrame(frame);
  }

  function stillFrame(): void {
    let prev: number | null = null;
    for (let i = 0; i <= 340; i++) {
      const tt = (i / 340) * 6.4;
      const chain = computeChain(tt);
      const y = chain[chain.length - 1].y;
      stampWave(y, prev, tt);
      prev = y;
    }
    draw(2.2, 0.5);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    termsRef.current = terms;
    speedRef.current = speed;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
    setN(String(terms));
    function onResize(): void {
      fit(); prevYRef.current = null;
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
  }, [terms, speed]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>1·3·5차 배음의 원만 겹치면 부드러운 원운동의 합이 뾰족한 구형파로 변하는 순간이 보이는데, 푸리에 급수가 각진 것도 사인의 합이라고 말하는 장면을 그대로 화면에 옮긴 것입니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b> 홀수 배음 4개 · 코사인 급수</span>
          <span className={styles.metaDim}>canvas · odd harmonics · requestAnimationFrame</span>
        </div>
      </div>
    </main>
  );
}
