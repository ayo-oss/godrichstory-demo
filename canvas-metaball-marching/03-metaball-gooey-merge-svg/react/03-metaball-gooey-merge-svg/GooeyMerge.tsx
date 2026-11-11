// GooeyMerge — vanilla 판(run/317/demo/03-metaball-gooey-merge-svg/index.html) 의 React 포트.
// 마칭 스퀘어 경계 추출로 만든 실제 경로(Path2D)를 그대로 fill+stroke 하고, 볼마다 잔광
// 트레일을 축적해 경로를 따라 색이 전환되는 스티키 병합을 만든다 — SVG 필터를 쓰지 않는다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GooeyMerge.module.scss";

export type GooeyMergeProps = {
  duration?: string;
  easing?: string;
  color?: string;
  balls?: number;     // 볼 개수 — 2 는 대화 장면, 5 는 군무
  threshold?: number; // 필드 임계값
  cell?: number;      // 격자 셀 픽셀 크기
  trail?: number;     // 트레일 잔광 감쇠(프레임당)
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Ball = { fx: number; fy: number; ph: number; ax: number; ay: number; cx: number; cy: number; rad: number };

const FIELD_LABEL = "구이 병합 끈적 합체 실험판";
const E_T = 0, E_R = 1, E_B = 2, E_L = 3;

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

function hexA(hex: string, a: number): string {
  if (hex.charAt(0) !== "#") return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function GooeyMerge({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#ff9ebb",
  balls: nBall = 3,
  threshold = 1.0,
  cell = 8,
  trail = 0.965,
}: GooeyMergeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const trailCvRef = useRef<HTMLCanvasElement | null>(null);
  const trailCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 }) as Box<{ w: number; h: number }>;
  const colsRef = useRef(0) as Box<number>;
  const rowsRef = useRef(0) as Box<number>;
  const gridRef = useRef(new Float32Array(0)) as Box<Float32Array>;
  const colRef = useRef<{ body: string; glow: string; sky: string; lilac: string; cream: string } | null>(null);
  const ballNRef = useRef(nBall) as Box<number>;
  const thrRef = useRef(threshold) as Box<number>;
  const cellRef = useRef(cell) as Box<number>;
  const trailRef = useRef(trail) as Box<number>;
  const ballsRef = useRef<Ball[]>([]) as Box<Ball[]>;
  const rafRef = useRef(0) as Box<number>;
  const [n, setN] = useState(String(nBall));
  const [still, setStill] = useState(false);
  const vars: Vars = { "--duration": duration, "--easing": easing, "--color": color };

  function reduced(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function buildBalls(): void {
    const rand = makePRNG(0x317a03);
    const arr: Ball[] = [];
    for (let i = 0; i < ballNRef.current; i++) {
      arr.push({
        fx: 0.3 + rand() * 0.4, fy: 0.26 + rand() * 0.4,
        ph: rand() * Math.PI * 2, ax: 0.3 + rand() * 0.2, ay: 0.28 + rand() * 0.2,
        cx: 0.5, cy: 0.5, rad: 34 + rand() * 16,
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
    const tc = trailCvRef.current;
    if (tc) {
      tc.width = cv.width;
      tc.height = cv.height;
      trailCtxRef.current = tc.getContext("2d");
    }
    colsRef.current = Math.max(16, Math.round(r.width / cellRef.current));
    rowsRef.current = Math.max(12, Math.round(r.height / cellRef.current));
    gridRef.current = new Float32Array((colsRef.current + 1) * (rowsRef.current + 1));
    ctxRef.current = ctx;
  }

  function ballPos(b: Ball, t: number, w: number, h: number): [number, number] {
    return [
      (b.cx + Math.sin(t * b.fx + b.ph) * b.ax) * w,
      (b.cy + Math.cos(t * b.fy + b.ph * 1.4) * b.ay) * h,
    ];
  }

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
    const { w: W, h: H } = sizeRef.current;
    const cw = W / colsRef.current;
    const ch = H / rowsRef.current;
    const g = gridRef.current;
    for (let gy = 0; gy <= rowsRef.current; gy++) {
      for (let gx = 0; gx <= colsRef.current; gx++) {
        g[gy * (colsRef.current + 1) + gx] = fieldAt(gx * cw, gy * ch, t);
      }
    }
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

  function loopCentroid(loop: [number, number][]): [number, number] {
    let sx = 0, sy = 0;
    for (let i = 0; i < loop.length; i++) { sx += loop[i][0]; sy += loop[i][1]; }
    return [sx / loop.length, sy / loop.length];
  }

  function nearestBall(cx: number, cy: number, t: number): number {
    const { w, h } = sizeRef.current;
    let best = 0, bd = Infinity;
    const balls = ballsRef.current;
    for (let i = 0; i < balls.length; i++) {
      const p = ballPos(balls[i], t, w, h);
      const d = (p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function draw(t: number): void {
    const ctx = ctxRef.current;
    const trailCtx = trailCtxRef.current;
    const trailCv = trailCvRef.current;
    const col = colRef.current;
    const { w: W, h: H } = sizeRef.current;
    if (!ctx || !col) return;
    sampleGrid(t);
    const loops = chainSegments(collectSegments(t));
    const ballCols = [col.body, col.glow, col.sky];

    if (trailCtx) {
      trailCtx.globalCompositeOperation = "source-over";
      trailCtx.fillStyle = `rgba(23,20,26,${(1 - trailRef.current) * 1.6})`;
      trailCtx.fillRect(0, 0, W, H);
      trailCtx.globalCompositeOperation = "lighter";
      const balls = ballsRef.current;
      for (let i = 0; i < balls.length; i++) {
        const p = ballPos(balls[i], t, W, H);
        const g = trailCtx.createRadialGradient(p[0], p[1], 0, p[0], p[1], balls[i].rad * 1.5);
        const c = ballCols[i % ballCols.length];
        g.addColorStop(0, hexA(c, 0.2));
        g.addColorStop(1, hexA(c, 0));
        trailCtx.fillStyle = g;
        trailCtx.fillRect(0, 0, W, H);
      }
      trailCtx.globalCompositeOperation = "source-over";
    }

    ctx.fillStyle = "#17141a";
    ctx.fillRect(0, 0, W, H);
    if (trailCv) ctx.drawImage(trailCv, 0, 0);

    const mist = ctx.createRadialGradient(
      W * (0.5 + Math.sin(t * 0.14 + 2) * 0.3), H * (0.5 + Math.cos(t * 0.12) * 0.3), 0,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.78,
    );
    mist.addColorStop(0, "rgba(110,200,255,0.08)");
    mist.addColorStop(1, "rgba(23,20,26,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, 0, W, H);

    for (let li = 0; li < loops.length; li++) {
      const path = new Path2D();
      smoothLoop(path, loops[li]);
      const c = loopCentroid(loops[li]);
      const bi = nearestBall(c[0], c[1], t);
      ctx.fillStyle = ballCols[bi % ballCols.length];
      ctx.globalAlpha = 0.92;
      ctx.fill(path);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col.lilac;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.stroke(path);
    }

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
    trailRef.current = trail;
    const cs = getComputedStyle(root);
    const tok = (name: string) => cs.getPropertyValue(name).trim();
    colRef.current = {
      body: tok("--gm-body"),
      glow: tok("--gm-glow"),
      sky: tok("--gm-sky"),
      lilac: tok("--gm-lilac"),
      cream: tok("--gm-cream"),
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
  }, [nBall, threshold, cell, trail]);

  const rootCls = still ? `${styles.root} ${styles.isStill}` : styles.root;

  return (
    <main className={styles.stage}>
      <div className={rootCls} ref={rootRef} style={vars}>
        <p className={styles.hint}>
          <span>블러 필터 없이 계산한 실제 경로를 채우고 두르면 잉크가 끌려가듯 볼이 끈적하게 합체합니다 — 지나간 자리엔 색이 남아 경로를 따라 전환됩니다</span>
        </p>
        <div
          className={styles.field}
          ref={fieldRef}
          role="application"
          aria-label={FIELD_LABEL}
          tabIndex={0}
        >
          <canvas className={styles.cv} ref={cvRef}></canvas>
          <canvas ref={trailCvRef} hidden></canvas>
        </div>
        <div className={styles.bar}>
          <span className={styles.meta}><b className={styles.val}>{n}</b>볼 · 끈적 병합 경로</span>
          <span className={styles.metaDim}>canvas · Path2D · setAttribute</span>
        </div>
      </div>
    </main>
  );
}
