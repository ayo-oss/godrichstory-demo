// ShapeSnap — vanilla 판(run/287/demo/03-canvas-shape-snap/index.html) 의 React 포트.
// pointermove 마다 clearRect 로 판을 비우고 확정 도형을 다시 그린 뒤, 끌고 있는 도형만 점선으로 얹는다.
// 사각은 strokeRect, 원은 arc, 직선은 moveTo/lineTo. 끝점은 배경 격자와 같은 8px 눈금에 달라붙는다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ShapeSnap.module.scss";

export type ShapeSnapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Point = { x: number; y: number };
type Shape = { kind: string; x: number; y: number; w: number; h: number };

const COUNT_LABEL = "도형 %d개";
const BOARD_LABEL = "도형 판, 확정한 도형 %d개";
const SNAP = 8; // 판 배경 격자와 같은 눈금 — 끝점이 여기에 달라붙는다

function trace(ctx: CanvasRenderingContext2D, s: Shape): void {
  if (s.kind === "rect") {
    // strokeRect 는 경로를 따로 열지 않고 사각 테두리를 한 번에 긋는다
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    return;
  }
  ctx.beginPath();
  if (s.kind === "circle") {
    // arc 는 중심·반지름·시작각·끝각 — 0 에서 2파이까지면 원 한 바퀴다
    ctx.arc(s.x + s.w / 2, s.y + s.h / 2, Math.max(Math.abs(s.w), Math.abs(s.h)) / 2, 0, Math.PI * 2);
  } else {
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + s.w, s.y + s.h);
  }
  ctx.stroke();
}

function applyRepaint(ctx: CanvasRenderingContext2D, shapes: Shape[], draft: Shape | null, width: number, height: number): void {
  // clearRect 로 판을 통째로 비우고 확정된 도형을 다시 그린 뒤, 끌고 있는 도형만 맨 위에 점선으로 얹는다
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.strokeStyle = "#17141a";
  for (const s of shapes) {
    trace(ctx, s);
  }
  if (draft) {
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = "#2f6df6";
    trace(ctx, draft);
    ctx.setLineDash([]);
  }
}

export default function ShapeSnap({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ShapeSnapProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const shapesRef = useRef<Shape[]>([]) as Box<Shape[]>;
  const originRef = useRef<Point | null>(null);
  const draftRef = useRef<Shape | null>(null);
  const [demo, setDemo] = useState(true);
  const [count, setCount] = useState(0);
  const [kind, setKind] = useState("rect");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, shapesRef.current, draftRef.current, canvas.width, canvas.height);
    setCount(shapesRef.current.length);
  }, [shapesRef]);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const board = boardRef.current;
    const canvas = inkRef.current;
    if (!board || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = board.getBoundingClientRect();
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
      const draft = draftRef.current;
      if (draft && (Math.abs(draft.w) >= SNAP || Math.abs(draft.h) >= SNAP)) {
        shapesRef.current.push(draft);
      }
      draftRef.current = null;
      repaint();
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [repaint, shapesRef]);

  function toLocal(event: ReactPointerEvent<HTMLDivElement>): Point | null {
    const canvas = inkRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.round((event.clientX - r.left) / SNAP) * SNAP,
      y: Math.round((event.clientY - r.top) / SNAP) * SNAP,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const point = toLocal(event);
    const board = boardRef.current;
    if (!point || !board) return;
    originRef.current = point;
    draftRef.current = { kind, x: point.x, y: point.y, w: 0, h: 0 };
    board.setPointerCapture(event.pointerId);
    repaint();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const draft = draftRef.current;
    const origin = originRef.current;
    if (!draft || !origin) return;
    const point = toLocal(event);
    if (!point) return;
    draft.w = point.x - origin.x;
    draft.h = point.y - origin.y;
    repaint();
  }

  function pickKind(value: string): void {
    setDemo(false);
    setKind(value);
  }

  function onUndo(): void {
    setDemo(false);
    shapesRef.current.pop();
    repaint();
  }

  function onWipe(): void {
    setDemo(false);
    shapesRef.current = [];
    repaint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const markCls = styles.mark;
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <div className={styles.tools} role="group" aria-label="도형 도구">
              <button type="button" className={`${styles.tool} ${styles.toolRect}`} aria-pressed={kind === "rect"} onClick={() => pickKind("rect")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M224,56V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z" opacity="0.2"/><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200Z"/></svg>
                <span>사각</span><span className={markCls} aria-hidden="true"></span>
              </button>
              <button type="button" className={`${styles.tool} ${styles.toolCircle}`} aria-pressed={kind === "circle"} onClick={() => pickKind("circle")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M96.26,37A8,8,0,0,1,102,27.29a104.11,104.11,0,0,1,52,0,8,8,0,0,1-2,15.75,8.15,8.15,0,0,1-2-.26,88.09,88.09,0,0,0-44,0A8,8,0,0,1,96.26,37ZM53.79,55.14a104,104,0,0,0-26,45,8,8,0,1,0,15.42,4.26,87.91,87.91,0,0,1,22-38.08A8,8,0,0,0,53.79,55.14ZM43.21,151.55a8,8,0,1,0-15.42,4.28,104,104,0,0,0,26,45,8,8,0,1,0,11.41-11.21A88.14,88.14,0,0,1,43.21,151.55ZM150,213.22a88,88,0,0,1-44,0,8,8,0,1,0-4,15.49,104.11,104.11,0,0,0,52,0,8,8,0,0,0-4-15.49ZM222.65,146a8,8,0,0,0-9.85,5.57,87.88,87.88,0,0,1-22,38.09,8,8,0,1,0,11.42,11.21,104.05,104.05,0,0,0,26-45A8,8,0,0,0,222.65,146Zm-9.86-41.54a8,8,0,0,0,15.42-4.28,104,104,0,0,0-26-45,8,8,0,1,0-11.41,11.21A88.14,88.14,0,0,1,212.79,104.45Z"/></svg>
                <span>원</span><span className={markCls} aria-hidden="true"></span>
              </button>
              <button type="button" className={`${styles.tool} ${styles.toolLine}`} aria-pressed={kind === "line"} onClick={() => pickKind("line")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M81,175A24,24,0,1,1,47,175,24,24,0,0,1,81,175ZM209,47A24,24,0,1,0,209,81,24,24,0,0,0,209,47Z" opacity="0.2"/><path d="M214.64,41.36a32,32,0,0,0-50.2,38.89L80.25,164.44a32.06,32.06,0,0,0-38.89,4.94h0a32,32,0,1,0,50.2,6.37l84.19-84.19a32,32,0,0,0,38.89-50.2Zm-139.33,162a16,16,0,0,1-22.64-22.64h0a16,16,0,0,1,22.63,0h0A16,16,0,0,1,75.31,203.33Zm128-128a16,16,0,1,1,0-22.63A16,16,0,0,1,203.33,75.3Z"/></svg>
                <span>직선</span><span className={markCls} aria-hidden="true"></span>
              </button>
            </div>
            <div className={styles.acts}>
              <span className={styles.count}><span className={styles.countReal} aria-live="polite">{COUNT_LABEL.replace("%d", String(count))}</span><span className={`${styles.countDemo} ${styles.countZero}`} aria-hidden="true">도형 0개</span><span className={`${styles.countDemo} ${styles.countOne}`} aria-hidden="true">도형 1개</span><span className={`${styles.countDemo} ${styles.countTwo}`} aria-hidden="true">도형 2개</span><span className={`${styles.countDemo} ${styles.countThree}`} aria-hidden="true">도형 3개</span></span>
              <button type="button" className={styles.btn} onClick={onUndo}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z" opacity="0.2"/><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"/></svg>
                <span>도형 하나 취소</span>
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnWipe}`} onClick={onWipe}>판 비우기</button>
            </div>
          </div>
          <div className={styles.board} ref={boardRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label={BOARD_LABEL.replace("%d", String(count))}></canvas>
            <svg className={styles.ghost} viewBox="0 0 300 108" aria-hidden="true">
              <path className={`${styles.draft} ${styles.draftRect}`} vectorEffect="non-scaling-stroke" d="M24,16 L136,16 L136,68 L24,68 Z"/>
              <path className={`${styles.firm} ${styles.firmRect}`} vectorEffect="non-scaling-stroke" d="M24,16 L136,16 L136,68 L24,68 Z"/>
              <path className={`${styles.draft} ${styles.draftCircle}`} vectorEffect="non-scaling-stroke" d="M238,42 A26,26 0 1 1 186,42 A26,26 0 1 1 238,42"/>
              <path className={`${styles.firm} ${styles.firmCircle}`} vectorEffect="non-scaling-stroke" d="M238,42 A26,26 0 1 1 186,42 A26,26 0 1 1 238,42"/>
              <path className={`${styles.draft} ${styles.draftLine}`} vectorEffect="non-scaling-stroke" d="M26,94 L274,80"/>
              <path className={`${styles.firm} ${styles.firmLine}`} vectorEffect="non-scaling-stroke" d="M26,94 L274,80"/>
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
