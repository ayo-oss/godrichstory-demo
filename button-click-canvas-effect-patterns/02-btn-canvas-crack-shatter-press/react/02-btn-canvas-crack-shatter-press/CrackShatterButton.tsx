// CrackShatterButton — vanilla 판(run/404/demo/02-btn-canvas-crack-shatter-press/index.html) 의 React 포트.
// 누른 좌표를 중심으로 균열 가지 나무(재귀 분기)를 만들어 시간에 따라 자라게 그린다. 값·상수는 vanilla 와 같다.
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./CrackShatterButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Segment = { x1: number; y1: number; x2: number; y2: number; t0: number; t1: number; w: number };
type Tree = { segs: Segment[]; t0: number };

const W = 480, H = 300;
const COLS = 60, ROWS = 38;
const CELL_W = W / COLS, CELL_H = H / ROWS;
const SEED = 20205;

const BTN_CANVAS_CRACK_BRANCH_COUNT = 6;
const CRACK_MAX_DEPTH = 3;
const CRACK_SEG_LEN = 44;
const CRACK_LEN_DECAY = 0.6;
const CRACK_ANGLE_SPREAD = 0.85;
const GLOW_DECAY = 0.90;
const MAX_TREES = 3;
const LINE_COLOR: [number, number, number] = [23, 20, 26];
const GLOW_COLOR: [number, number, number] = [255, 247, 230];

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fidx(gx: number, gy: number): number {
  return gy * COLS + gx;
}

export default function CrackShatterButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const fieldRef = useRef<Float32Array>(new Float32Array(COLS * ROWS)) as Box<Float32Array>;
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const treesRef = useRef<Tree[]>([]) as Box<Tree[]>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const nextAutoRef = useRef<number>(0) as Box<number>;

  function stampGlow(px: number, py: number, r: number): void {
    const field = fieldRef.current;
    const gx = Math.round(px / CELL_W), gy = Math.round(py / CELL_H);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        const v = 1 - d / (r + 1);
        const i = fidx(x, y);
        field[i] = Math.min(1, field[i] + v * 0.6);
      }
    }
  }

  function genBranch(x: number, y: number, angle: number, len: number, depth: number, t0: number, segs: Segment[]): void {
    if (depth > CRACK_MAX_DEPTH || len < 5) return;
    const rnd = rndRef.current;
    const ang = angle + (rnd() - 0.5) * 0.35;
    const x2 = x + Math.cos(ang) * len;
    const y2 = y + Math.sin(ang) * len;
    const dur = 120 + len * 4;
    segs.push({ x1: x, y1: y, x2: x2, y2: y2, t0: t0, t1: t0 + dur, w: Math.max(1, 3 - depth) });
    const childT0 = t0 + dur * 0.6;
    const childA = [ang + CRACK_ANGLE_SPREAD * 0.5, ang - CRACK_ANGLE_SPREAD * 0.5];
    for (let i = 0; i < childA.length; i++) {
      genBranch(x2, y2, childA[i] + (rnd() - 0.5) * 0.3, len * CRACK_LEN_DECAY, depth + 1, childT0, segs);
    }
  }

  function buildTree(cx: number, cy: number): Segment[] {
    const rnd = rndRef.current;
    const segs: Segment[] = [];
    for (let i = 0; i < BTN_CANVAS_CRACK_BRANCH_COUNT; i++) {
      const base = (Math.PI * 2 * i) / BTN_CANVAS_CRACK_BRANCH_COUNT;
      const ang = base + (rnd() - 0.5) * 0.5;
      genBranch(cx, cy, ang, CRACK_SEG_LEN, 0, 0, segs);
    }
    return segs;
  }

  function paint(now: number): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const field = fieldRef.current;
    for (let i = 0; i < field.length; i++) field[i] *= GLOW_DECAY;

    const trees = treesRef.current;
    const lineDraws: [number, number, number, number, number][] = [];
    for (let t = 0; t < trees.length; t++) {
      const tree = trees[t];
      const elapsed = now - tree.t0;
      for (let s = 0; s < tree.segs.length; s++) {
        const seg = tree.segs[s];
        if (elapsed < seg.t0) continue;
        const progress = Math.max(0, Math.min(1, (elapsed - seg.t0) / (seg.t1 - seg.t0)));
        const tipx = seg.x1 + (seg.x2 - seg.x1) * progress;
        const tipy = seg.y1 + (seg.y2 - seg.y1) * progress;
        if (progress < 1) stampGlow(tipx, tipy, 3);
        lineDraws.push([seg.x1, seg.y1, tipx, tipy, seg.w]);
      }
    }

    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = field[fidx(x, y)];
        if (v < 0.03) continue;
        const a = Math.min(1, v);
        ctx.fillStyle = "rgba(" + GLOW_COLOR[0] + "," + GLOW_COLOR[1] + "," + GLOW_COLOR[2] + "," + a.toFixed(3) + ")";
        ctx.fillRect(x * CELL_W, y * CELL_H, CELL_W + 1, CELL_H + 1);
      }
    }

    ctx.strokeStyle = "rgba(" + LINE_COLOR[0] + "," + LINE_COLOR[1] + "," + LINE_COLOR[2] + ",.92)";
    ctx.lineCap = "round";
    for (let d = 0; d < lineDraws.length; d++) {
      const ln = lineDraws[d];
      ctx.lineWidth = ln[4];
      ctx.beginPath();
      ctx.moveTo(ln[0], ln[1]);
      ctx.lineTo(ln[2], ln[3]);
      ctx.stroke();
    }
  }

  function pushTree(px: number, py: number, t0: number): void {
    const trees = treesRef.current;
    trees.push({ segs: buildTree(px, py), t0: t0 });
    if (trees.length > MAX_TREES) trees.shift();
  }

  function press(px: number, py: number): void {
    demoRef.current = false;
    pushTree(px, py, performance.now());
    if (reduceRef.current) {
      const trees = treesRef.current;
      trees[trees.length - 1].t0 = performance.now() - 999999;
      paint(performance.now());
    }
  }

  function pointFromClient(cx: number, cy: number): [number, number] {
    const cv = cvRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(cx - r.left) * (W / r.width), (cy - r.top) * (H / r.height)];
  }

  function buttonCenter(): [number, number] {
    const btn = btnRef.current;
    const cv = cvRef.current;
    if (!btn || !cv) return [W / 2, H / 2];
    const r = btn.getBoundingClientRect();
    const c = cv.getBoundingClientRect();
    return [(r.left + r.width / 2 - c.left) * (W / c.width), (r.top + r.height / 2 - c.top) * (H / c.height)];
  }

  function pressAtButtonCenter(): void {
    const p = buttonCenter();
    press(p[0], p[1]);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLCanvasElement>): void {
    const p = pointFromClient(e.clientX, e.clientY);
    press(p[0], p[1]);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    pressAtButtonCenter();
  }

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c0 = buttonCenter();
    if (reduceRef.current) {
      pushTree(c0[0], c0[1], performance.now() - 999999);
      paint(performance.now());
      return;
    }
    pushTree(c0[0], c0[1], performance.now());

    function frame(now: number): void {
      if (demoRef.current && now >= nextAutoRef.current) {
        const p = buttonCenter();
        pushTree(p[0], p[1], now);
        nextAutoRef.current = now + 640;
      }
      paint(now);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.cc}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={onPointerDown} />
        <button className={styles.btn} ref={btnRef} type="button" onClick={pressAtButtonCenter} onKeyDown={onKeyDown}>
          삭제하기
        </button>
        <p className={styles.hint}>버튼을 누르면 중심에서 균열이 갈라져 뻗습니다</p>
      </div>
    </main>
  );
}
