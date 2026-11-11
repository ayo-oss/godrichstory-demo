// SignatureFitInput — vanilla 판(run/287/demo/08-signature-fit-to-input/index.html) 의 React 포트.
// 큰 판에 canvas 2D 로 손글씨를 받고, 잉크가 실제로 차지한 사각형과 목표 칸의 getBoundingClientRect 를
// 재서 scale 값을 구한 뒤 transform-origin: left center 를 축으로 줄여 폼 칸에 앉힌다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SignatureFitInput.module.scss";

export type SignatureFitInputProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = { x: number; y: number };
type InkBox = { left: number; right: number; top: number; bottom: number };
type Box<T> = { current: T };

const SLOT_INSET = 8;
const HINT = "크게 쓴 뒤 칸에 넣기를 누르세요";
const DONE = "칸 높이에 맞춰 %s 배로 앉혔습니다";

function applyRepaint(ctx: CanvasRenderingContext2D, strokes: Point[][], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#17141a";
  ctx.lineWidth = 3.4;
  for (const pts of strokes) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      // 두 점의 중점을 제어점으로 삼아 꺾임을 둥글게 잇는다
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i - 1].x) / 2, (pts[i].y + pts[i - 1].y) / 2);
    }
    ctx.stroke();
  }
}

// 잉크가 실제로 차지한 사각형 — 판 전체가 아니라 이 높이를 칸 높이에 맞춘다
function inkBounds(strokes: Point[][]): InkBox | null {
  let box: InkBox | null = null;
  for (const pts of strokes) {
    for (const p of pts) {
      if (!box) {
        box = { left: p.x, right: p.x, top: p.y, bottom: p.y };
        continue;
      }
      box.left = Math.min(box.left, p.x);
      box.right = Math.max(box.right, p.x);
      box.top = Math.min(box.top, p.y);
      box.bottom = Math.max(box.bottom, p.y);
    }
  }
  return box;
}

export default function SignatureFitInput({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: SignatureFitInputProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Point[][]>([]) as Box<Point[][]>;
  const currentRef = useRef<Point[] | null>(null);
  const [demo, setDemo] = useState(true);
  const [fitted, setFitted] = useState(false);
  const [fitTransform, setFitTransform] = useState("");
  const [message, setMessage] = useState(HINT);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, strokesRef.current, canvas.width, canvas.height);
  }, [strokesRef]);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const pad = padRef.current;
    const canvas = canvasRef.current;
    if (!pad || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    repaint();
  }, [repaint]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    function onUp(): void {
      currentRef.current = null;
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function toLocal(event: ReactPointerEvent<HTMLDivElement>): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function unfit(): void {
    setFitTransform("");
    setFitted(false);
    setMessage(HINT);
  }

  function fitToSlot(): void {
    setDemo(false);
    const box = inkBounds(strokesRef.current);
    const pad = padRef.current;
    const slot = slotRef.current;
    if (!box || !pad || !slot) return;
    // 목표 칸의 크기를 짐작하지 않고 getBoundingClientRect 로 실측한다 — 폰트·줄높이가 바뀌어도 따라간다
    const slotRect = slot.getBoundingClientRect();
    const padRect = pad.getBoundingClientRect();
    const inkHeight = Math.max(8, box.bottom - box.top);
    const scaleValue = (slotRect.height * 0.72) / inkHeight;
    const targetX = slotRect.left - padRect.left + SLOT_INSET;
    const targetY = slotRect.top - padRect.top + slotRect.height / 2;
    // transform-origin 이 왼쪽 가운데다 — 글씨가 칸의 왼쪽 기준선에 맞아야 하므로 축을 자기 중심이 아닌 왼쪽에 둔다
    const tx = targetX - box.left * scaleValue;
    const ty = targetY - (padRect.height / 2 + (box.top + inkHeight / 2 - padRect.height / 2) * scaleValue);
    setFitTransform(`translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${scaleValue.toFixed(3)})`);
    setFitted(true);
    setMessage(DONE.replace("%s", scaleValue.toFixed(2)));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    if (fitted) unfit();
    const point = toLocal(event);
    const pad = padRef.current;
    if (!point || !pad) return;
    currentRef.current = [point];
    strokesRef.current.push(currentRef.current);
    pad.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = currentRef.current;
    if (!current) return;
    const point = toLocal(event);
    if (!point) return;
    current.push(point);
    repaint();
  }

  function onReset(): void {
    setDemo(false);
    strokesRef.current = [];
    unfit();
    repaint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const slotCls = [styles.slot, fitted ? styles.isFilled : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.pad} ref={padRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <p className={styles.hint}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M67.41,142.56C35.71,129.52,45.41,32.07,78,32,111.82,32.05,92,90.26,67.41,142.56Z" opacity="0.2"/><path d="M232,168H63.86c2.66-5.24,5.33-10.63,8-16.11,14.94,1.65,32.58-8.78,52.66-31.14,5,13.46,14.45,30.93,30.58,31.25,9.09.18,18.11-5.2,27.42-16.37C189.31,143.75,203.3,152,232,152a8,8,0,0,0,0-16c-30.43,0-39.43-10.45-40-16.11a7.67,7.67,0,0,0-5.46-7.75,8.14,8.14,0,0,0-9.25,3.49C165.23,134.17,158,136.06,155.38,136c-8.26-.16-16.66-19.52-19.54-33.42a8,8,0,0,0-14.09-3.37C101.54,124.55,88,133.08,79.57,135.29,88.06,116.42,94.4,99.85,98.46,85.9c6.82-23.44,7.32-39.83,1.51-50.1-3-5.38-9.34-11.8-22.06-11.8C61.85,24,49.18,39.18,43.14,65.65c-3.59,15.71-4.18,33.21-1.62,48s7.87,25.55,15.59,31.94c-3.73,7.72-7.53,15.26-11.23,22.41H24a8,8,0,0,0,0,16H37.41c-11.32,21-20.12,35.64-20.26,35.88a8,8,0,1,0,13.71,8.24c.15-.26,11.27-18.79,24.7-44.12H232a8,8,0,0,0,0-16ZM58.74,69.21C62.72,51.74,70.43,40,77.91,40c5.33,0,7.1,1.86,8.13,3.67,3,5.33,6.52,24.19-21.66,86.39C56.12,118.78,53.31,93,58.74,69.21Z"/></svg>
              <span>크게 서명하세요</span>
            </p>
            <button type="button" className={styles.reset} onClick={onReset}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z" opacity="0.2"/><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"/></svg>
              <span>다시 쓰기</span>
            </button>
            <div className={styles.inkWrap} style={fitTransform ? { transform: fitTransform } : undefined}>
              <canvas className={styles.ink} ref={canvasRef} role="img" aria-label="큰 서명 판"></canvas>
              <svg className={styles.ghost} viewBox="0 0 300 76" preserveAspectRatio="none" aria-hidden="true">
                <path className={`${styles.stroke} ${styles.strokeA}`} pathLength="100" d="M26,49 C40,15 58,10 64,26 C70,43 54,58 47,49 C40,41 62,20 86,22 C108,23 100,49 116,49 C132,49 134,25 148,25 C162,25 154,51 170,48"/>
                <path className={`${styles.stroke} ${styles.strokeB}`} pathLength="100" d="M162,51 C190,46 216,35 242,20"/>
                <path className={`${styles.stroke} ${styles.strokeC}`} pathLength="100" d="M246,23 C210,56 152,66 92,59"/>
              </svg>
            </div>
            <span className={styles.rule} aria-hidden="true"></span>
          </div>
          <div className={styles.form}>
            <span className={styles.formLabel} id="slotLabel">서명</span>
            <div className={slotCls} ref={slotRef} role="img" aria-labelledby="slotLabel">
              <svg className={styles.ok} viewBox="0 0 24 24" aria-hidden="true"><polyline points="5,13 10,18 19,7"/></svg>
            </div>
            <button type="button" className={styles.fit} onClick={fitToSlot}>칸에 넣기</button>
          </div>
          <p className={styles.live}>
            <span className={styles.liveReal} aria-live="polite">{message}</span>
            <span className={`${styles.liveDemo} ${styles.sayBefore}`} aria-hidden="true">크게 쓴 뒤 칸에 넣기를 누르세요</span>
            <span className={`${styles.liveDemo} ${styles.sayAfter}`} aria-hidden="true">칸 높이에 맞춰 0.34 배로 앉혔습니다</span>
          </p>
        </div>
      </div>
    </main>
  );
}
