// FourierHarmonicSliderLab — vanilla 판(run/321/demo/08-fourier-harmonic-slider-lab/index.html) 의 React 포트.
// 배음 슬라이더 실험 — 몇 개의 원만 남겨도 본떼가 남는가(계수 절약·압축)의 실험판.
//   ① 하트 곡선(04 와 동일)의 DFT 계수를 크기 순으로 준비한다.
//   ② 슬라이더(1~64)가 체인에 얹을 계수 개수를 정한다. 1개면 원 하나 — 물방울 한 바퀴.
//   ③ 늘릴수록 디테일이 되살아나 오목한 하트가 완성된다 — JPEG·MP3 의 "버려도 되는 계수"와 같은 원리.
// 자동 모드에서는 슬라이더 값이 스스로 1→64→1 로 왕복한다. 사람이 직접 잡으면(pointerdown·input)
// 자동 왕복을 멈춘다.
// 화면이 사는 장치 — 원 개수가 매 순간 변하므로 체인·궤적 전체가 매 프레임 다시 계산된다.
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./FourierHarmonicSliderLab.module.scss";

export type FourierHarmonicSliderLabProps = {
  duration?: string;
  easing?: string;
  color?: string;
  n?: number;         // 경로 샘플 수
  maxShow?: number;   // 슬라이더 최대(체인에 얹을 계수 수)
  sweep?: number;     // 자동 왕복 주기(초)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type RGB = [number, number, number];
type Pt = { x: number; y: number };
type Coef = { freq: number; re: number; im: number; amp: number };

const FIELD_LABEL = "배음 슬라이더 실험판";
const TAU = Math.PI * 2;

function heartPath(u: number): Pt {
  const t = u * TAU;
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x: x / 17, y: y / 17 };
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

export default function FourierHarmonicSliderLab({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#b7c8ff",
  n = 256,
  maxShow = 64,
  sweep = 3.2
}: FourierHarmonicSliderLabProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const colRef = useRef<{ ink: RGB; glow: RGB; hot: RGB } | null>(null);
  const trailCvRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const nRef = useRef(n) as Box<number>;
  const maxShowRef = useRef(maxShow) as Box<number>;
  const sweepRef = useRef(sweep) as Box<number>;
  const pathRef = useRef<Pt[]>([]) as Box<Pt[]>;
  const coefRef = useRef<Coef[]>([]) as Box<Coef[]>;
  const autoModeRef = useRef(true) as Box<boolean>;
  const wRef = useRef(0) as Box<number>;
  const hRef = useRef(0) as Box<number>;
  const dprRef = useRef(1) as Box<number>;
  const rafRef = useRef(0) as Box<number>;
  const [cnt, setCnt] = useState("1");
  const [sliderVal, setSliderVal] = useState(1);
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

  function chainAt(u: number, show: number): Pt[] {
    const W = wRef.current, H = hRef.current;
    const COEF = coefRef.current;
    const base = Math.min(W, H) * 0.4;
    const cx = W * 0.5, cy = H * 0.5;
    const pts: Pt[] = [{ x: cx, y: cy }];
    for (let i = 0; i < show && i < COEF.length; i++) {
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

  function drawGrid(ctx: CanvasRenderingContext2D, t: number): void {
    const W = wRef.current, H = hRef.current;
    const col = colRef.current;
    if (!col) return;
    const cx = W * 0.5, cy = H * 0.5;
    const maxR = Math.sqrt(W * W + H * H) * 0.5;
    const sweepA = t * 0.85;
    for (let b = 0; b < 18; b++) {
      ctx.fillStyle = rgba(col.glow, 0.095 * (1 - b / 18));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweepA - (b + 1) * 0.055, sweepA - b * 0.055);
      ctx.closePath();
      ctx.fill();
    }
    const spin = t * 0.28;
    for (let i = 0; i < 16; i++) {
      const a = spin + (i / 16) * TAU;
      ctx.strokeStyle = rgba(col.glow, i % 2 === 0 ? 0.095 : 0.055);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
  }

  function draw(u: number, pulse: number, show: number, gt: number): Pt {
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

    const pts = chainAt(u, show);
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
        ctx.strokeStyle = rgba(col.glow, 0.46);
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
    trailCtx.strokeStyle = rgba(col.hot, 0.8);
    trailCtx.lineWidth = 1.7;
    trailCtx.lineCap = "round";
    trailCtx.beginPath();
    trailCtx.moveTo(prev.x, prev.y);
    trailCtx.lineTo(pen.x, pen.y);
    trailCtx.stroke();
    trailCtx.strokeStyle = rgba(col.hot, 0.12);
    trailCtx.lineWidth = 4.6;
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
    const lt = (now - t0) / 1000;
    const u = (lt * 0.55) % 1;
    const pulse = 0.5 + 0.5 * Math.sin(lt * 8.0);

    let show: number;
    if (autoModeRef.current) {
      // 자동 왕복 — 1→64→1. 사람이 잡으면 멈춘다
      const tri = 0.5 - 0.5 * Math.cos(lt * TAU / sweepRef.current);
      show = 1 + Math.round(tri * (maxShowRef.current - 1));
      const slider = sliderRef.current;
      if (slider && slider.value !== String(show)) {
        slider.value = String(show);
        setSliderVal(show);
      }
    } else {
      const slider = sliderRef.current;
      show = slider ? parseInt(slider.value, 10) : maxShowRef.current;
    }

    decayTrail();
    const pen = draw(u, pulse, show, lt * TAU);
    stampTrail(pen);
    setCnt(String(show));
    rafRef.current = requestAnimationFrame(frame);
  }

  // 사람이 잡으면 자동 왕복을 멈춘다
  function onSliderPointerDown(_e: ReactPointerEvent<HTMLInputElement>): void {
    autoModeRef.current = false;
  }
  function onSliderInput(e: ChangeEvent<HTMLInputElement>): void {
    autoModeRef.current = false;
    prevPenRef.current = null;
    const v = parseInt(e.target.value, 10);
    setSliderVal(v);
    setCnt(String(v));
  }

  function stillFrame(): void {
    // reduce — 원 8개 궤적을 미리 쌓은 뒤 한 장 고정
    const show = 8;
    let prev = chainAt(0, show)[show];
    for (let i = 1; i <= 200; i++) {
      const pen = chainAt(i / 200, show)[show];
      stampTrail(pen);
      prev = pen;
    }
    draw(0.5, 0.5, show, 2.1);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    nRef.current = n;
    maxShowRef.current = maxShow;
    sweepRef.current = sweep;
    colRef.current = {
      ink: tokRGB(root, "--fe-ink"),
      glow: tokRGB(root, "--fe-glow"),
      hot: tokRGB(root, "--fe-hot"),
    };
    fit();
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
  }, [n, maxShow, sweep]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>사용할 원 개수를 슬라이더로 1부터 전체까지 움직이면 하트가 물방울에서 점점 또렷한 하트로 되살아나는데, 이것이 JPEG 음악 압축까지 같은 원리의 얼마나 줄여도 본떼가 남는가 실험입니다</span>
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
        <p className={styles.panel}>
          <label className={styles.label} htmlFor="feSlider">원 개수</label>
          <input
            className={styles.slider}
            id="feSlider"
            ref={sliderRef}
            type="range"
            min={1}
            max={maxShow}
            step={1}
            value={sliderVal}
            aria-label="원 개수"
            onPointerDown={onSliderPointerDown}
            onChange={onSliderInput}
          />
        </p>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{cnt}</b>개 사용 중 · 하트 재합성</span>
          <span className={styles.metaDim}>canvas · truncated series · slider</span>
        </div>
      </div>
    </main>
  );
}
