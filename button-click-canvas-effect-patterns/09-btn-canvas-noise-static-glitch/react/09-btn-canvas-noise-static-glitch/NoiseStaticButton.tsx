// NoiseStaticButton — vanilla 판(run/404/demo/09-btn-canvas-noise-static-glitch/index.html) 의 React 포트.
// 오류 값이 false에서 true로 뒤집히는 순간 버튼 표면 픽셀마다 밝기 값을 무작위로 다시 계산해
// 텔레비전 정적 같은 노이즈를 짧게 덮어씌운다.
import { useEffect, useRef } from "react";
import styles from "./NoiseStaticButton.module.scss";

type Box<T> = { current: T };
type KeyEvt = { key: string; preventDefault(): void };

const W = 480, H = 300;
const SEED = 90909;

const BW = 300, BH = 140;
const BX = (W - BW) / 2, BY = (H - BH) / 2;

const NOISE_CELL = 3;
const BTN_CANVAS_STATIC_BURST_MS = 650;
const TICK_MS = 40;

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

export default function NoiseStaticButton() {
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const errorOnRef = useRef<boolean>(false) as Box<boolean>;
  const burstT0Ref = useRef<number | null>(null) as Box<number | null>;
  const reduceRef = useRef<boolean>(false) as Box<boolean>;
  const demoRef = useRef<boolean>(true) as Box<boolean>;
  const frameRef = useRef<number>(0) as Box<number>;

  function drawPanel(ctx: CanvasRenderingContext2D, errored: boolean): void {
    roundRect(ctx, BX, BY, BW, BH, 16);
    ctx.fillStyle = "#17141a";
    ctx.fill();
    ctx.fillStyle = errored ? "#ff8a6b" : "#fff7e6";
    ctx.font = "700 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("다시 시도", BX + BW / 2, BY + BH / 2);
    if (errored) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ff8a6b";
      roundRect(ctx, BX + 1.5, BY + 1.5, BW - 3, BH - 3, 15);
      ctx.stroke();
    }
  }

  function drawNoise(ctx: CanvasRenderingContext2D, envelope: number, tick: number): void {
    ctx.save();
    roundRect(ctx, BX, BY, BW, BH, 16);
    ctx.clip();
    ctx.globalAlpha = envelope;
    for (let y = BY; y < BY + BH; y += NOISE_CELL) {
      for (let x = BX; x < BX + BW; x += NOISE_CELL) {
        const n = hashNoise(x / NOISE_CELL, y / NOISE_CELL, SEED + tick);
        const v = Math.floor(n * 255);
        ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
        ctx.fillRect(x, y, NOISE_CELL, NOISE_CELL);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function render(now: number): void {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    drawPanel(ctx, errorOnRef.current);

    const burstT0 = burstT0Ref.current;
    if (burstT0 !== null) {
      const elapsed = now - burstT0;
      if (elapsed >= BTN_CANVAS_STATIC_BURST_MS) {
        burstT0Ref.current = null;
      } else {
        const envelope = 1 - elapsed / BTN_CANVAS_STATIC_BURST_MS;
        const tick = Math.floor(elapsed / TICK_MS);
        drawNoise(ctx, envelope, tick);
      }
    }
  }

  function trigger(): void {
    demoRef.current = false;
    errorOnRef.current = !errorOnRef.current;
    if (errorOnRef.current) burstT0Ref.current = performance.now();
    if (reduceRef.current) render(performance.now());
  }

  function onKeyDown(e: KeyEvt): void {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    trigger();
  }

  useEffect(() => {
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceRef.current) {
      errorOnRef.current = true;
      burstT0Ref.current = performance.now() - BTN_CANVAS_STATIC_BURST_MS * 0.4;
      render(performance.now());
      return;
    }

    function frame(now: number): void {
      if (demoRef.current) {
        // 데모 재생 중엔 정적이 끊기지 않도록 번짐이 끝나는 즉시 다음 번짐을 이어 붙인다.
        errorOnRef.current = true;
        const t0 = burstT0Ref.current;
        if (t0 === null || now - t0 >= BTN_CANVAS_STATIC_BURST_MS) burstT0Ref.current = now;
      }
      render(now);
      frameRef.current = requestAnimationFrame(frame);
    }
    frameRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.ns}>
        <canvas className={styles.cv} ref={cvRef} width={W} height={H} onPointerDown={trigger} />
        <button className={styles.btn} ref={btnRef} type="button" onClick={trigger} onKeyDown={onKeyDown}>
          다시 시도
        </button>
        <p className={styles.hint}>오류 값이 뒤집히는 순간 정적 노이즈가 짧게 덮입니다</p>
      </div>
    </main>
  );
}
