// FieldThreshold — vanilla 판(run/317/demo/01-metaball-field-threshold/index.html) 의 React 포트.
// 필드 한 겹 — 오프스크린 캔버스에 putImageData 로 부드러운 radial 감쇠 스프라이트를 굽고
// getImageData 로 읽어 룩업 테이블로 쓴다. 볼마다 r²/d² 감쇠를 격자 칸에 합산하고
// 임계값을 넘는 칸만 채운다 — 두 볼이 가까워지면 다리가 돋는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FieldThreshold.module.scss";

export type FieldThresholdProps = {
  duration?: string;
  easing?: string;
  color?: string;
  balls?: number;     // 볼 개수 — 변형 "성긴/붐비는 장면" 축
  threshold?: number; // 필드 임계값 — 낮추면 다리가 굵어진다
  cell?: number;      // 격자 셀 픽셀 크기
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Ball = { fx: number; fy: number; ph: number; ax: number; ay: number; cx: number; cy: number; rad: number };

const FIELD_LABEL = "필드 한 겹 임계값 실험판";
const SPR_R = 64;

function makePRNG(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function FieldThreshold({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
  balls: nBall = 5,
  threshold = 0.92,
  cell = 6,
}: FieldThresholdProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colsRef = useRef(0) as Box<number>;
  const rowsRef = useRef(0) as Box<number>;
  const lutRef = useRef(new Float32Array(SPR_R)) as Box<Float32Array>;
  const colRef = useRef<{ bands: string[]; cream: string } | null>(null);
  const ballNRef = useRef(nBall) as Box<number>;
  const thrRef = useRef(threshold) as Box<number>;
  const cellRef = useRef(cell) as Box<number>;
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(nBall));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // 스프라이트 굽기 — putImageData 로 r²/d² 감쇠를 픽셀 단위로 쓰고 getImageData 로 룩업을 읽는다
  function bakeSprite(): void {
    const c = document.createElement("canvas");
    c.width = SPR_R * 2;
    c.height = SPR_R * 2;
    const sc = c.getContext("2d");
    if (!sc) return;
    const img = sc.createImageData(SPR_R * 2, SPR_R * 2);
    const d = img.data;
    for (let y = 0; y < SPR_R * 2; y++) {
      for (let x = 0; x < SPR_R * 2; x++) {
        const dx = x - SPR_R;
        const dy = y - SPR_R;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const v = Math.min(1, (SPR_R * SPR_R) / (dist * dist));
        const idx = (y * SPR_R * 2 + x) * 4;
        d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255;
        d[idx + 3] = Math.round(v * 255);
      }
    }
    sc.putImageData(img, 0, 0);
    const check = sc.getImageData(SPR_R, 0, SPR_R, 1).data;
    for (let i = 0; i < SPR_R; i++) lutRef.current[i] = check[i * 4 + 3] / 255;
  }

  function buildBalls(): void {
    const rand = makePRNG(0x317a01);
    const arr: Ball[] = [];
    for (let i = 0; i < ballNRef.current; i++) {
      arr.push({
        fx: 0.32 + rand() * 0.5, fy: 0.26 + rand() * 0.46,
        ph: rand() * Math.PI * 2, ax: 0.3 + rand() * 0.22, ay: 0.28 + rand() * 0.22,
        cx: 0.5, cy: 0.5, rad: 52 + rand() * 26,
      });
    }
    ballsRef.current = arr;
  }

  function fit(): void {
    const field = fieldRef.current;
    const cv = cvRef.current;
    if (!field || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const r = field.getBoundingClientRect();
    sizeRef.current.w = r.width;
    sizeRef.current.h = r.height;
    cv.width = Math.round(r.width);
    cv.height = Math.round(r.height);
    colsRef.current = Math.max(24, Math.round(r.width / cellRef.current));
    rowsRef.current = Math.max(16, Math.round(r.height / cellRef.current));
    ctxRef.current = ctx;
  }

  function ballPos(b: Ball, t: number, w: number, h: number): [number, number] {
    return [
      (b.cx + Math.sin(t * b.fx + b.ph) * b.ax) * w,
      (b.cy + Math.cos(t * b.fy + b.ph * 1.4) * b.ay) * h,
    ];
  }

  function fieldAt(px: number, py: number, t: number): [number, number] {
    const { w, h } = sizeRef.current;
    let sum = 0;
    let closest = 0;
    let closestD = Infinity;
    const balls = ballsRef.current;
    const lut = lutRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, w, h);
      const dx = px - p[0];
      const dy = py - p[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scaled = dist * (SPR_R / balls[i].rad);
      const v = scaled >= SPR_R ? 0 : lut[Math.min(SPR_R - 1, Math.round(scaled))];
      sum += v;
      if (dist < closestD) { closestD = dist; closest = i; }
    }
    return [sum, closest];
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    ctx.fillStyle = "#17141a";
    ctx.fillRect(0, 0, W, H);

    const mist = ctx.createRadialGradient(
      W * (0.5 + Math.sin(t * 0.13) * 0.3), H * (0.5 + Math.cos(t * 0.11) * 0.3), 0,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.75,
    );
    mist.addColorStop(0, "rgba(185,160,255,0.22)");
    mist.addColorStop(0.55, "rgba(110,200,255,0.10)");
    mist.addColorStop(1, "rgba(23,20,26,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);

    const cw = W / colsRef.current;
    const ch = H / rowsRef.current;
    const thr = thrRef.current;
    for (let gy = 0; gy < rowsRef.current; gy++) {
      const py = (gy + 0.5) * ch;
      for (let gx = 0; gx < colsRef.current; gx++) {
        const px = (gx + 0.5) * cw;
        const fc = fieldAt(px, py, t);
        if (fc[0] >= thr) {
          const over = Math.min(1, (fc[0] - thr) / thr);
          ctx.fillStyle = col.bands[fc[1] % col.bands.length];
          ctx.globalAlpha = 0.55 + over * 0.45;
          ctx.fillRect(gx * cw - 0.5, gy * ch - 0.5, cw + 1, ch + 1);
        }
      }
    }
    ctx.globalAlpha = 1;

    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, W, H);
      ctx.fillStyle = col.cream;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function stillFrame(): void { draw(0.6); }

  let t0 = -1;
  function frame(now: number): void {
    if (t0 < 0) t0 = now;
    const t = (now - t0) / 1000;
    draw(t);
    rafRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    ballNRef.current = nBall;
    thrRef.current = threshold;
    cellRef.current = cell;
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    colRef.current = {
      bands: [tok("--ft-mint"), tok("--ft-sky"), tok("--ft-lilac"), tok("--ft-pink")],
      cream: tok("--ft-cream"),
    };
    bakeSprite();
    buildBalls();
    fit();
    setN(String(nBall));
    function onResize(): void {
      fit();
      if (reduced()) stillFrame();
    }
    window.addEventListener("resize", onResize);
    if (reduced()) {
      stillFrame();
      setStill(true);
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nBall, threshold, cell]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>볼마다 거리 감쇠(반지름² ÷ 거리²)를 격자 칸에 더해 스칼라 필드를 만들고 임계값을 넘는 칸만 채우면, 두 볼이 가까워질 때 사이에 다리가 돋아납니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>볼 · 감쇠 필드 임계값</span>
          <span className={styles.metaDim}>canvas · getImageData · putImageData</span>
        </div>
      </div>
    </main>
  );
}
