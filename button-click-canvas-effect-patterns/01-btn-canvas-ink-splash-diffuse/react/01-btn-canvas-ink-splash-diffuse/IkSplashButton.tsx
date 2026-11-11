// IkSplashButton — vanilla 판(run/404/demo/01-btn-canvas-ink-splash-diffuse/index.html) 의 React 포트.
// 클릭 좌표를 중심으로 확산 필드(field)에 값을 주입하고, 매 프레임 이웃 평균으로 끌리는 확산 계산을 돌려
// 캔버스에 격자 블록으로 그린다. 값·상수는 vanilla 와 같다.
import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./IkSplashButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const W = 480, H = 300;
const COLS = 60, ROWS = 38;
const CELL_W = W / COLS, CELL_H = H / ROWS;
const DIFFUSE_RATE = 0.46;
const DECAY_PER_FRAME = 0.978;
const INK_COLOR: [number, number, number] = [91, 140, 248];
const SEED = 10102;

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function idx(gx: number, gy: number): number {
  return gy * COLS + gx;
}

export default function IkSplashButton() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const fieldRef = useRef<Float32Array>(new Float32Array(COLS * ROWS)) as Box<Float32Array>;
  const nextRef = useRef<Float32Array>(new Float32Array(COLS * ROWS)) as Box<Float32Array>;
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;
  const autoStartRef = useRef<number | null>(null) as Box<number | null>;
  const nextAutoRef = useRef<number>(0) as Box<number>;

  function injectAt(px: number, py: number, rIn?: number): void {
    const field = fieldRef.current;
    const gx = Math.max(0, Math.min(COLS - 1, Math.round(px / CELL_W)));
    const gy = Math.max(0, Math.min(ROWS - 1, Math.round(py / CELL_H)));
    const r = rIn || 4;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r) continue;
        const v = 1 - d / (r + 1);
        const i = idx(x, y);
        field[i] = Math.max(field[i], v);
      }
    }
  }

  function diffuseStep(): void {
    const field = fieldRef.current;
    const next = nextRef.current;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        let sum = 0, n = 0;
        if (x > 0) { sum += field[idx(x - 1, y)]; n++; }
        if (x < COLS - 1) { sum += field[idx(x + 1, y)]; n++; }
        if (y > 0) { sum += field[idx(x, y - 1)]; n++; }
        if (y < ROWS - 1) { sum += field[idx(x, y + 1)]; n++; }
        const avg = n ? sum / n : field[i];
        const v = field[i] + (avg - field[i]) * DIFFUSE_RATE;
        next[i] = v * DECAY_PER_FRAME;
      }
    }
    fieldRef.current = next;
    nextRef.current = field;
  }

  function render(): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const field = fieldRef.current;
    ctx.fillStyle = "#17141a";
    ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = field[idx(x, y)];
        if (v < 0.02) continue;
        const a = Math.min(1, v);
        ctx.fillStyle = "rgba(" + INK_COLOR[0] + "," + INK_COLOR[1] + "," + INK_COLOR[2] + "," + a.toFixed(3) + ")";
        ctx.fillRect(x * CELL_W, y * CELL_H, CELL_W + 1, CELL_H + 1);
      }
    }
  }

  function press(px: number, py: number): void {
    demoRef.current = false;
    injectAt(px, py, 5);
    injectAt(px + 70, py - 40, 3);
    injectAt(px - 80, py + 30, 3);
    if (reduceRef.current) render();
  }

  function pointFromClient(cx: number, cy: number): [number, number] {
    const cv = cvRef.current;
    if (!cv) return [0, 0];
    const r = cv.getBoundingClientRect();
    return [(cx - r.left) * (W / r.width), (cy - r.top) * (H / r.height)];
  }

  function pressAtButtonCenter(): void {
    const btn = btnRef.current;
    const cv = cvRef.current;
    if (!btn || !cv) return;
    const r = btn.getBoundingClientRect();
    const c = cv.getBoundingClientRect();
    press((r.left + r.width / 2 - c.left) * (W / c.width), (r.top + r.height / 2 - c.top) * (H / c.height));
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

  function syntheticPoint(): [number, number] {
    const rnd = rndRef.current;
    const a = rnd() * Math.PI * 2;
    const r2 = 40 + rnd() * 170;
    return [W / 2 + Math.cos(a) * r2, H / 2 + Math.sin(a) * r2];
  }

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      injectAt(W / 2, H / 2, 5);
      render();
      return;
    }
    injectAt(W / 2, H / 2, 6);
    injectAt(W / 2 - 130, H / 2 + 60, 4);
    injectAt(W / 2 + 140, H / 2 - 55, 4);
    render();

    function frame(now: number): void {
      if (autoStartRef.current === null) autoStartRef.current = now;
      const t = now - (autoStartRef.current as number);
      if (demoRef.current && t >= nextAutoRef.current) {
        const p = syntheticPoint();
        injectAt(p[0], p[1], 4);
        nextAutoRef.current = t + 260;
      }
      diffuseStep();
      render();
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ik} ref={rootRef}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={onPointerDown} />
        <button className={styles.btn} ref={btnRef} type="button" onClick={pressAtButtonCenter} onKeyDown={onKeyDown}>
          제출하기
        </button>
        <p className={styles.hint}>버튼을 눌러 보세요 — 누른 자리에서 잉크가 번집니다</p>
      </div>
    </main>
  );
}
