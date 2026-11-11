// SandFillButton — vanilla 판(run/404/demo/07-btn-canvas-sand-fill-progress/index.html) 의 React 포트.
// 진행 값이 오를수록 목표 높이 값을 따라 쌓인 높이 값이 붙고, 동시에 캔버스 위쪽 빈 공간에서
// 모래 알갱이가 끊임없이 떨어져 내려와 진행률이 오르는 걸 실감나게 보여준다.
import { useEffect, useRef } from "react";
import styles from "./SandFillButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };
type Grain = { x: number; y: number; vy: number; size: number; col: number };

const W = 480, H = 300;
const SEED = 70722;
const BW = 300, BH = 140;
const BX = (W - BW) / 2, BY = (H - BH) / 2;
const COLS = 36;
const COL_W = BW / COLS;
const GRAVITY = 560;
const SPAWN_Y = 12;
const SPAWN_INTERVAL_MS = 30;
const EASE_RATE = 5.5;

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashNoise(x: number, y: number, seed: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.0013) * 43758.5453;
  return v - Math.floor(v);
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const colJitter: number[] = [];
for (let ci = 0; ci < COLS; ci++) colJitter.push((hashNoise(ci, 7, SEED) - 0.5) * 10);

export default function SandFillButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const rndRef = useRef(makeLcg(SEED)) as Box<() => number>;
  const pileRef = useRef<Float32Array>(new Float32Array(COLS)) as Box<Float32Array>;
  const grainsRef = useRef<Grain[]>([]) as Box<Grain[]>;
  const targetFillRef = useRef<number>(0) as Box<number>;
  const lastSpawnRef = useRef<number>(0) as Box<number>;
  const lastTRef = useRef<number | null>(null) as Box<number | null>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;

  function updateGrains(dt: number): void {
    const grains = grainsRef.current;
    if (grains.length > 90) grains.length = 90;
    const pile = pileRef.current;
    for (let i = grains.length - 1; i >= 0; i--) {
      const g = grains[i];
      g.vy += GRAVITY * dt;
      g.y += g.vy * dt;
      const floorY = BY + BH - pile[g.col];
      if (g.y + g.size / 2 >= floorY) grains.splice(i, 1);
    }
  }

  function updatePile(dt: number): void {
    const pile = pileRef.current;
    const targetHeight = targetFillRef.current * BH;
    for (let c = 0; c < COLS; c++) {
      const t = Math.max(0, Math.min(BH, targetHeight + colJitter[c]));
      pile[c] += (t - pile[c]) * Math.min(1, dt * EASE_RATE);
    }
  }

  function render(now: number, dt: number): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const rnd = rndRef.current;
    const pile = pileRef.current;
    const grains = grainsRef.current;

    updateGrains(dt);
    updatePile(dt);

    if (now - lastSpawnRef.current >= SPAWN_INTERVAL_MS) {
      lastSpawnRef.current = now;
      const col = Math.floor(rnd() * COLS);
      const size = 3 + rnd() * 3;
      grains.push({ x: BX + col * COL_W + COL_W / 2, y: SPAWN_Y, vy: 40 + rnd() * 30, size, col });
    }

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    roundRect(ctx, BX, BY, BW, BH, 14);
    ctx.clip();
    ctx.fillStyle = "#17141a";
    ctx.fillRect(BX, BY, BW, BH);

    for (let c1 = 0; c1 < COLS; c1++) {
      const h = pile[c1];
      if (h <= 0) continue;
      const x = BX + c1 * COL_W;
      const y = BY + BH - h;
      const grad = ctx.createLinearGradient(0, y, 0, BY + BH);
      grad.addColorStop(0, "#e3c48a");
      grad.addColorStop(1, "#b8925c");
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, COL_W + 1, h + 2);
    }

    const speckleCell = 4;
    for (let sy = 0; sy < BH; sy += speckleCell) {
      for (let sx = 0; sx < BW; sx += speckleCell) {
        const col = Math.min(COLS - 1, Math.floor(sx / COL_W));
        const topY = BH - pile[col];
        if (sy < topY) continue;
        const n = hashNoise(sx, sy, SEED);
        if (n > 0.74) {
          ctx.fillStyle = "rgba(120,90,50," + (0.25 + n * 0.3).toFixed(3) + ")";
          ctx.fillRect(BX + sx, BY + sy, speckleCell - 1, speckleCell - 1);
        }
      }
    }

    ctx.fillStyle = "#fff7e6";
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("다운로드", BW / 2 + BX, BY + 20);
    ctx.restore();

    for (let i2 = 0; i2 < grains.length; i2++) {
      const gr = grains[i2];
      ctx.beginPath();
      ctx.arc(gr.x, gr.y, gr.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#d9b171";
      ctx.fill();
    }
  }

  function trigger(): void {
    demoRef.current = false;
    targetFillRef.current = targetFillRef.current > 0.5 ? 0 : 1;
    if (reduceRef.current) render(performance.now(), 0.05);
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    trigger();
  }

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceRef.current) {
      const pile = pileRef.current;
      targetFillRef.current = 0.55;
      const th = targetFillRef.current * BH;
      for (let c2 = 0; c2 < COLS; c2++) {
        pile[c2] = Math.max(0, Math.min(BH, th + colJitter[c2]));
      }
      render(performance.now(), 0.05);
      return;
    }

    function frame(now: number): void {
      const last = lastTRef.current;
      const dt = last === null ? 0.016 : Math.min(0.05, (now - last) / 1000);
      lastTRef.current = now;
      if (demoRef.current) {
        const t = now % 900;
        if (t < 500) targetFillRef.current = t / 500;
        else if (t < 600) targetFillRef.current = 1;
        else targetFillRef.current = Math.max(0, 1 - (t - 600) / 300);
      }
      render(now, dt);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.sf}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={trigger} />
        <button className={styles.btn} ref={btnRef} type="button" onClick={trigger} onKeyDown={onKeyDown}>
          다운로드
        </button>
        <p className={styles.hint}>누르면 진행 값이 오르며 모래가 알갱이째 쌓입니다</p>
      </div>
    </main>
  );
}
