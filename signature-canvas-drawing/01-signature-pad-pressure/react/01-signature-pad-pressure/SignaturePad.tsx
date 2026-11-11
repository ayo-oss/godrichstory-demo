// SignaturePad — vanilla 판(run/287/demo/01-signature-pad-pressure/index.html) 의 React 포트.
// canvas 2D 에 포인터 궤적을 quadraticCurveTo 로 잇고, 필압이 없으면 직전 점과의 거리로 굵기를 정한다.
// 획은 배열의 배열로 쌓아 두므로 한 획 취소는 pop 한 번이다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SignaturePad.module.scss";

export type SignaturePadProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = { x: number; y: number; pressure: number; w: number };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const PAD_LABEL = "서명 칸, 획 %d개";
const LIVE_LABEL = "획 %d개";

// 필압이 있으면 그 값, 없으면 직전 점과의 거리(속도)로 굵기를 정한다 — 빠를수록 가늘게
function widthFor(point: Point, lastPoint: Point): number {
  if (point.pressure > 0 && point.pressure !== 0.5) {
    return 1.2 + point.pressure * 5.2;
  }
  const dx = point.x - lastPoint.x;
  const dy = point.y - lastPoint.y;
  return Math.max(1.4, 5.4 - Math.sqrt(dx * dx + dy * dy) * 0.34);
}

function midOf(a: Point, b: Point): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function applyRepaint(ctx: CanvasRenderingContext2D, strokes: Point[][], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#17141a";
  for (const pts of strokes) {
    if (pts.length < 2) continue;
    // 구간은 중점에서 중점으로 잇고 꺾이는 점은 제어점으로 쓴다.
    // 시작점을 중점이 아니라 점 자체에 두면 중점과 그 점 사이가 매번 비어 획이 절반씩 끊긴다
    let start = { x: pts[0].x, y: pts[0].y };
    for (let i = 1; i < pts.length - 1; i++) {
      const end = midOf(pts[i], pts[i + 1]);
      ctx.lineWidth = pts[i].w;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, end.x, end.y);
      ctx.stroke();
      start = end;
    }
    const last = pts[pts.length - 1];
    ctx.lineWidth = last.w;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
}

export default function SignaturePad({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: SignaturePadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]) as Box<Point[][]>;
  const currentRef = useRef<Point[] | null>(null);
  const lastRef = useRef<Point | null>(null);
  const [demo, setDemo] = useState(true);
  const [count, setCount] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, strokesRef.current, canvas.width, canvas.height);
    setCount(strokesRef.current.length);
  }, []);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const pad = padRef.current;
    const canvas = inkRef.current;
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
    const canvas = inkRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top, pressure: event.pressure, w: 3 };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const point = toLocal(event);
    const pad = padRef.current;
    if (!point || !pad) return;
    lastRef.current = point;
    currentRef.current = [point];
    strokesRef.current.push(currentRef.current);
    pad.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = currentRef.current;
    const last = lastRef.current;
    if (!current || !last) return;
    const point = toLocal(event);
    if (!point) return;
    point.w = widthFor(point, last);
    current.push(point);
    lastRef.current = point;
    repaint();
  }

  function onUndo(): void {
    strokesRef.current.pop();
    repaint();
  }

  function onClear(): void {
    strokesRef.current = [];
    repaint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <p className={styles.label}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z" opacity="0.2"/><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31l83.67-83.66,3.48,13.9-36.8,36.79a8,8,0,0,0,11.31,11.32l40-40a8,8,0,0,0,2.11-7.6l-6.9-27.61L227.32,96A16,16,0,0,0,227.32,73.37ZM48,208V179.31L76.69,208Zm48-3.31L51.31,160,136,75.31,180.69,120Zm96-96L147.32,64l24-24L216,84.69Z"/></svg>
              <span>여기에 서명해 주세요</span>
            </p>
            <div className={styles.acts}>
              <button type="button" className={styles.btn} onClick={onUndo}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z" opacity="0.2"/><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"/></svg>
                <span>한 획 취소</span>
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnWipe}`} onClick={onClear}>지우기</button>
            </div>
          </div>
          <div className={styles.pad} ref={padRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label={PAD_LABEL.replace("%d", String(count))}></canvas>
            <svg className={styles.ghost} viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true">
              <path className={`${styles.stroke} ${styles.strokeA}`} pathLength="100" d="M26,68 C40,26 58,20 64,40 C70,60 54,78 47,68 C40,58 62,32 86,34 C108,36 100,68 116,68 C132,68 134,38 148,38 C162,38 154,70 170,66"/>
              <path className={`${styles.stroke} ${styles.strokeB}`} pathLength="100" d="M162,70 C190,64 216,50 242,32"/>
              <path className={`${styles.stroke} ${styles.strokeC}`} pathLength="100" d="M246,36 C210,76 152,88 92,80"/>
            </svg>
            <span className={styles.rule} aria-hidden="true"></span>
          </div>
          <p className={styles.live}>
            <span className={styles.liveReal} aria-live="polite">{LIVE_LABEL.replace("%d", String(count))}</span>
            <span className={`${styles.liveDemo} ${styles.liveZero}`} aria-hidden="true">획 0개</span>
            <span className={`${styles.liveDemo} ${styles.liveOne}`} aria-hidden="true">획 1개</span>
            <span className={`${styles.liveDemo} ${styles.liveTwo}`} aria-hidden="true">획 2개</span>
            <span className={`${styles.liveDemo} ${styles.liveThree}`} aria-hidden="true">획 3개</span>
          </p>
        </div>
      </div>
    </main>
  );
}
