// MarchingSquares — vanilla 판(run/317/demo/02-metaball-marching-squares/index.html) 의 React 포트.
// 마칭 스퀘어 — 스칼라 필드(볼마다 r²/d² 감쇠 합)를 오프스크린 저해상 캔버스(격자 모서리당 1px)에
// radialGradient 스프라이트 + lighter 합성으로 굽고 getImageData 로 읽어 격자에 되돌린다(07 의 패턴).
// 각 칸 네 모서리의 임계 초과 비트로 16가지 경우를 골라 경계가 지나는 변 위 점을 선형 보간으로 찾는다.
// 세그먼트를 닫힌 고리로 엮어 quadraticCurveTo 로 평활한 뒤 Path2D 에 fill+stroke — 볼이 합체/분리한다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MarchingSquares.module.scss";

export type MarchingSquaresProps = {
  duration?: string;
  easing?: string;
  color?: string;
  balls?: number;     // 볼 개수
  threshold?: number; // 필드 임계값
  cell?: number;      // 격자 셀 픽셀 크기
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Ball = { fx: number; fy: number; ph: number; ax: number; ay: number; cx: number; cy: number; rad: number };

const FIELD_LABEL = "마칭 스퀘어 경계 추출 실험판";
const E_T = 0, E_R = 1, E_B = 2, E_L = 3;
const K = 8, SCALE = 100, STOPS = 32; // 필드 스프라이트 — 감쇠 절단 계수·판독 척도·gradient 정지점 수

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

// 16경우 테이블 — 코너 비트(TL=1 TR=2 BR=4 BL=8). 5·10 은 ambiguous(문자열 표식)
function caseSegments(cs: number): number[][] | string {
  switch (cs) {
    case 0: case 15: return [];
    case 1: case 14: return [[E_T, E_L]];
    case 2: case 13: return [[E_T, E_R]];
    case 3: case 12: return [[E_L, E_R]];
    case 4: case 11: return [[E_R, E_B]];
    case 6: case 9:  return [[E_T, E_B]];
    case 7: case 8:  return [[E_L, E_B]];
    case 5:  return "AMB-x";
    case 10: return "AMB-+";
  }
  return [];
}

export default function MarchingSquares({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  balls: nBall = 5,
  threshold = 1.0,
  cell = 8,
}: MarchingSquaresProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colsRef = useRef(0) as Box<number>;
  const rowsRef = useRef(0) as Box<number>;
  const gridRef = useRef(new Float32Array(0)) as Box<Float32Array>;
  const colRef = useRef<{ fill: string; deep: string; edge: string; cream: string; bg: string } | null>(null);
  const ballNRef = useRef(nBall) as Box<number>;
  const thrRef = useRef(threshold) as Box<number>;
  const cellRef = useRef(cell) as Box<number>;
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const lowRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const fieldCvRef = useRef<HTMLCanvasElement | null>(null);
  const fieldCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(nBall));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildBalls(): void {
    const rand = makePRNG(0x317a02);
    const arr: Ball[] = [];
    for (let i = 0; i < ballNRef.current; i++) {
      arr.push({
        fx: 0.3 + rand() * 0.5, fy: 0.24 + rand() * 0.44,
        ph: rand() * Math.PI * 2, ax: 0.3 + rand() * 0.24, ay: 0.28 + rand() * 0.24,
        cx: 0.5, cy: 0.5, rad: 42 + rand() * 22,
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
    colsRef.current = Math.max(16, Math.round(r.width / cellRef.current));
    rowsRef.current = Math.max(12, Math.round(r.height / cellRef.current));
    // 오프스크린 필드 캔버스 — 격자 모서리당 1px
    let fieldCv = fieldCvRef.current;
    if (!fieldCv) {
      fieldCv = document.createElement("canvas");
      fieldCvRef.current = fieldCv;
      fieldCtxRef.current = fieldCv.getContext("2d", { willReadFrequently: true });
    }
    lowRef.current.w = colsRef.current + 1;
    lowRef.current.h = rowsRef.current + 1;
    fieldCv.width = lowRef.current.w;
    fieldCv.height = lowRef.current.h;
    gridRef.current = new Float32Array(lowRef.current.w * lowRef.current.h);
    ctxRef.current = ctx;
  }

  function ballPos(b: Ball, t: number, w: number, h: number): [number, number] {
    return [
      (b.cx + Math.sin(t * b.fx + b.ph) * b.ax) * w,
      (b.cy + Math.cos(t * b.fy + b.ph * 1.4) * b.ay) * h,
    ];
  }

  // ── 필드 굽기 + 픽셀 판독 ──
  // 볼마다 r²/d² 감쇠를 회색조 radialGradient 로 오프스크린 캔버스에 그리고 lighter 합성으로
  // 겹한다. getImageData 로 읽어 SCALE 로 나누면 이전 fieldAt 판(Σ r²·0.5/d²)과 같은 척도.
  function drawField(t: number): void {
    const fieldCtx = fieldCtxRef.current;
    if (!fieldCtx) return;
    const { w: W, h: H } = sizeRef.current;
    const cols = colsRef.current;
    const rows = rowsRef.current;
    const { w: LOWW, h: LOWH } = lowRef.current;
    const cw = W / cols;
    const ch = H / rows;
    fieldCtx.globalCompositeOperation = "source-over";
    fieldCtx.fillStyle = "#000";
    fieldCtx.fillRect(0, 0, LOWW, LOWH);
    fieldCtx.globalCompositeOperation = "lighter";
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, W, H);
      const cx = p[0] / cw;
      const cy = p[1] / ch;
      const r2 = balls[i].rad * balls[i].rad * 0.5;
      const R = (Math.sqrt(r2) * K) / cw;
      const g = fieldCtx.createRadialGradient(cx, cy, 0, cx, cy, R);
      for (let s = 0; s < STOPS; s++) {
        const off = s / STOPS;
        const fr = Math.max(off, 1 / (STOPS * 4));
        const v = 1 / (fr * fr * K * K);
        const px = Math.min(255, Math.round(v * SCALE));
        g.addColorStop(off, `rgb(${px},${px},${px})`);
      }
      g.addColorStop(1, "rgb(0,0,0)"); // 꼬리 절단 — 반경 밖은 0
      fieldCtx.fillStyle = g;
      fieldCtx.fillRect(0, 0, LOWW, LOWH);
    }
    fieldCtx.globalCompositeOperation = "source-over";
  }

  function classify(): void {
    const fieldCtx = fieldCtxRef.current;
    if (!fieldCtx) return;
    const { w: LOWW, h: LOWH } = lowRef.current;
    const img = fieldCtx.getImageData(0, 0, LOWW, LOWH);
    const d = img.data;
    const g = gridRef.current;
    for (let gy = 0; gy < LOWH; gy++) {
      for (let gx = 0; gx < LOWW; gx++) {
        g[gy * LOWW + gx] = d[(gy * LOWW + gx) * 4] / SCALE;
      }
    }
  }

  // ambiguous(5·10) 칸의 중심값만 실계산으로 보강 — getImageData 픽셀과 같은 r²/d² 합
  function fieldAt(px: number, py: number, t: number): number {
    const { w, h } = sizeRef.current;
    let sum = 0;
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, w, h);
      const dx = px - p[0];
      const dy = py - p[1];
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) d2 = 1;
      sum += (balls[i].rad * balls[i].rad * 0.5) / d2;
    }
    return sum;
  }

  function sampleGrid(t: number): void {
    drawField(t);
    classify();
  }

  function lerpPt(gx: number, gy: number, edge: number, cw: number, ch: number): [number, number] {
    const g = gridRef.current;
    const stride = colsRef.current + 1;
    const vTL = g[gy * stride + gx];
    const vTR = g[gy * stride + gx + 1];
    const vBR = g[(gy + 1) * stride + gx + 1];
    const vBL = g[(gy + 1) * stride + gx];
    const x0 = gx * cw;
    const y0 = gy * ch;
    const ip = (a: number, b: number) => (thrRef.current - a) / (b - a);
    switch (edge) {
      case E_T: return [x0 + cw * ip(vTL, vTR), y0];
      case E_B: return [x0 + cw * ip(vBL, vBR), y0 + ch];
      case E_L: return [x0, y0 + ch * ip(vTL, vBL)];
      case E_R: return [x0 + cw, y0 + ch * ip(vTR, vBR)];
    }
    return [x0, y0];
  }

  function collectSegments(t: number): [[number, number], [number, number]][] {
    const { w: W, h: H } = sizeRef.current;
    const cw = W / colsRef.current;
    const ch = H / rowsRef.current;
    const g = gridRef.current;
    const stride = colsRef.current + 1;
    const thr = thrRef.current;
    const pts: [[number, number], [number, number]][] = [];
    for (let gy = 0; gy < rowsRef.current; gy++) {
      for (let gx = 0; gx < colsRef.current; gx++) {
        const vTL = g[gy * stride + gx];
        const vTR = g[gy * stride + gx + 1];
        const vBR = g[(gy + 1) * stride + gx + 1];
        const vBL = g[(gy + 1) * stride + gx];
        const cs =
          (vTL > thr ? 1 : 0) | (vTR > thr ? 2 : 0) | (vBR > thr ? 4 : 0) | (vBL > thr ? 8 : 0);
        if (cs === 0 || cs === 15) continue;
        const segs = caseSegments(cs);
        if (typeof segs === "string") {
          const mc = fieldAt((gx + 0.5) * cw, (gy + 0.5) * ch, t);
          const flip = (cs === 5) === (mc <= thr);
          const a = flip
            ? [[E_T, E_R], [E_L, E_B]] as number[][]
            : [[E_T, E_L], [E_R, E_B]] as number[][];
          for (let k = 0; k < 2; k++) {
            pts.push([lerpPt(gx, gy, a[k][0], cw, ch), lerpPt(gx, gy, a[k][1], cw, ch)]);
          }
        } else {
          for (let s = 0; s < segs.length; s++) {
            pts.push([lerpPt(gx, gy, segs[s][0], cw, ch), lerpPt(gx, gy, segs[s][1], cw, ch)]);
          }
        }
      }
    }
    return pts;
  }

  function chainSegments(segs: [[number, number], [number, number]][]): [number, number][][] {
    const cellPx = cellRef.current;
    const eps2 = (cellPx * 1.5) * (cellPx * 1.5);
    const used = new Uint8Array(segs.length);
    const loops: [number, number][][] = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const loop: [number, number][] = [segs[i][0], segs[i][1]];
      let guard = 0;
      while (guard++ < 4000) {
        const tail = loop[loop.length - 1];
        let found = -1;
        for (let j = 0; j < segs.length; j++) {
          if (used[j]) continue;
          let dx = segs[j][0][0] - tail[0];
          let dy = segs[j][0][1] - tail[1];
          if (dx * dx + dy * dy < eps2) { found = j; loop.push(segs[j][1]); break; }
          dx = segs[j][1][0] - tail[0];
          dy = segs[j][1][1] - tail[1];
          if (dx * dx + dy * dy < eps2) { loop.push(segs[j][0]); found = j; break; }
        }
        if (found < 0) break;
        used[found] = 1;
      }
      if (loop.length >= 3) loops.push(loop);
    }
    return loops;
  }

  function smoothLoop(path: Path2D, loop: [number, number][]): void {
    const n = loop.length;
    path.moveTo((loop[0][0] + loop[1][0]) / 2, (loop[0][1] + loop[1][1]) / 2);
    for (let i = 1; i <= n; i++) {
      const cur = loop[i % n];
      const nxt = loop[(i + 1) % n];
      path.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
    }
    path.closePath();
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    sampleGrid(t);
    const loops = chainSegments(collectSegments(t));

    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, W, H);

    const mist = ctx.createRadialGradient(
      W * (0.5 + Math.sin(t * 0.12) * 0.32), H * (0.5 + Math.cos(t * 0.1) * 0.3), 0,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.8,
    );
    mist.addColorStop(0, "rgba(255,247,230,0.5)");
    mist.addColorStop(1, "rgba(255,247,230,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);

    // 임계값 내부 미리보기 채움(격자 픽셀)
    const cw = W / colsRef.current;
    const ch = H / rowsRef.current;
    const g = gridRef.current;
    const stride = colsRef.current + 1;
    ctx.fillStyle = col.deep;
    ctx.globalAlpha = 0.16;
    for (let gy = 0; gy < rowsRef.current; gy++) {
      for (let gx = 0; gx < colsRef.current; gx++) {
        if (g[gy * stride + gx] > thrRef.current) ctx.fillRect(gx * cw, gy * ch, cw, ch);
      }
    }
    ctx.globalAlpha = 1;

    const path = new Path2D();
    for (let li = 0; li < loops.length; li++) smoothLoop(path, loops[li]);
    ctx.fillStyle = col.fill;
    ctx.globalAlpha = 0.9;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col.edge;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.stroke(path);

    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, W, H);
      ctx.fillStyle = col.cream;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
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
      fill: tok("--ms-fill"),
      deep: tok("--ms-deep"),
      edge: tok("--ms-edge"),
      cream: tok("--ms-cream"),
      bg: "#ffd23f",
    };
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
          <span>네 모서리의 임계 초과 비트로 16가지 경우를 고르고 경계 점을 선형 보간으로 찾으면 매끈한 닫힌 윤곽이 됩니다 — 볼이 다니며 합체와 분리를 반복합니다</span>
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
          <span className={styles.meta}><b className={styles.val}>{n}</b>볼 · 마칭 스퀘어 윤곽</span>
          <span className={styles.metaDim}>canvas · getImageData · Path2D · quadraticCurveTo</span>
        </div>
      </div>
    </main>
  );
}
