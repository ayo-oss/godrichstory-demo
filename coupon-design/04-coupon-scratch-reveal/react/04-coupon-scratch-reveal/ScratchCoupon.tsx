// ScratchCoupon — vanilla 판(run/283/demo/04-coupon-scratch-reveal/index.html) 의 React 포트.
// canvas 에 은박을 칠하고 포인터를 따라 destination-out 으로 지운다. 알파 샘플로 벗겨진 비율을
// 실측해 55% 를 넘으면 통째로 지우고 할인율을 알린다. 값·수치는 vanilla 와 같다.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ScratchCoupon.module.scss";

export type ScratchCouponProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const FOIL_WIDTH = 240;
const FOIL_HEIGHT = 88;
const BRUSH_RADIUS = 16;
const CLEAR_THRESHOLD = 0.55;

// 은박 칠 — 작은 틈 균열 무늬까지
function applyPaint(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, width, height);
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, "#c9ccd6");
  grad.addColorStop(0.5, "#e8eaf0");
  grad.addColorStop(1, "#b9bdc9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(23,20,26,.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    ctx.beginPath();
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() * 24 - 12), y + (Math.random() * 10 - 5));
    ctx.stroke();
  }
}

// 실제 긁기 — destination-out 원을 계속 지운다
function applyScratch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

// 얼마나 벗겨졌나 — 알파 샘플로 실측
function clearedRatio(ctx: CanvasRenderingContext2D, width: number, height: number): number {
  const data = ctx.getImageData(0, 0, width, height).data;
  let clear = 0;
  const total = data.length / 4;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 40) {
      clear++;
    }
  }
  return clear / total;
}

export default function ScratchCoupon({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: ScratchCouponProps) {
  const foilRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<boolean>(false);
  const [demo, setDemo] = useState(true);
  const [scratched, setScratched] = useState(false);
  const [live, setLive] = useState("");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 은박은 마운트 때 한 번 칠한다 — 다시 칠하면 긁은 자리가 되살아난다
  useEffect(() => {
    const canvas = foilRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyPaint(ctx, FOIL_WIDTH, FOIL_HEIGHT);
  }, []);

  // 포인터를 떼면 어디서 떼든 긋기를 끝낸다
  useEffect(() => {
    function onUp(): void {
      drawingRef.current = false;
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function getContext(): CanvasRenderingContext2D | null {
    const canvas = foilRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function toCanvasPoint(event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    const canvas = foilRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) * (FOIL_WIDTH / r.width),
      y: (event.clientY - r.top) * (FOIL_HEIGHT / r.height),
    };
  }

  function applyFinish(ctx: CanvasRenderingContext2D): void {
    setScratched(true);
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, 0, FOIL_WIDTH, FOIL_HEIGHT);
    setLive("할인율은 30%였어요");
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (scratched) return;
    setDemo(false);
    drawingRef.current = true;
    const ctx = getContext();
    const p = toCanvasPoint(event);
    if (!ctx || !p) return;
    applyScratch(ctx, p.x, p.y);
    const canvas = foilRef.current;
    if (canvas && canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!drawingRef.current || scratched) return;
    const ctx = getContext();
    const p = toCanvasPoint(event);
    if (!ctx || !p) return;
    applyScratch(ctx, p.x, p.y);
    if (clearedRatio(ctx, FOIL_WIDTH, FOIL_HEIGHT) > CLEAR_THRESHOLD) {
      applyFinish(ctx);
    }
  }

  function onReveal(): void {
    if (scratched) return;
    const ctx = getContext();
    if (!ctx) return;
    applyFinish(ctx);
  }

  const cls = [styles.root, demo ? styles.isDemo : "", scratched ? styles.isOpen : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.head}>
            <p className={styles.title}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M232,104c0,24-40,48-104,48S24,128,24,104,64,56,128,56,232,80,232,104Z" opacity="0.2"/><path d="M207.58,63.84C186.85,53.48,159.33,48,128,48S69.15,53.48,48.42,63.84,16,88.78,16,104v48c0,15.22,11.82,29.85,32.42,40.16S96.67,208,128,208s58.85-5.48,79.58-15.84S240,167.22,240,152V104C240,88.78,228.18,74.15,207.58,63.84ZM128,64c62.64,0,96,23.23,96,40s-33.36,40-96,40-96-23.23-96-40S65.36,64,128,64Zm-8,95.86v32c-19-.62-35-3.42-48-7.49V153.05A203.43,203.43,0,0,0,120,159.86Zm16,0a203.43,203.43,0,0,0,48-6.81v31.31c-13,4.07-29,6.87-48,7.49ZM32,152V133.53a82.88,82.88,0,0,0,16.42,10.63c2.43,1.21,5,2.35,7.58,3.43V178C40.17,170.16,32,160.29,32,152Zm168,26V147.59c2.61-1.08,5.15-2.22,7.58-3.43A82.88,82.88,0,0,0,224,133.53V152C224,160.29,215.83,170.16,200,178Z"/></svg>
              <span>긁어 보세요</span>
            </p>
            <button type="button" className={styles.reveal} onClick={onReveal}>바로 보기</button>
          </div>
          <div className={styles.zone} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <div className={styles.prize}>
              <p className={styles.pct}>30<i>%</i></p>
              <p className={styles.say}>숨겨진 할인</p>
            </div>
            <canvas className={styles.foil} ref={foilRef} width={FOIL_WIDTH} height={FOIL_HEIGHT} aria-hidden="true"></canvas>
            <div className={styles.demoFoil} aria-hidden="true"><span className={styles.demoText}>은박을 긁어 주세요</span></div>
            <div className={styles.remnant} aria-hidden="true"></div>
            <div className={styles.coin} aria-hidden="true"></div>
          </div>
          <p className={styles.live} aria-live="polite">{live}</p>
        </div>
      </div>
    </main>
  );
}
