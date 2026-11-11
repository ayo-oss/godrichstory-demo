// PenToolbar — vanilla 판(run/287/demo/02-canvas-pen-highlighter-eraser/index.html) 의 React 포트.
// 도구 세 개가 다른 것은 canvas 2D 의 합성 방식(globalCompositeOperation) 하나다.
// 획은 목록으로 쌓아 두고 매번 처음부터 다시 그린다 — canvas 크기를 바꾸면 문맥 상태가 초기화되기 때문이다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./PenToolbar.module.scss";

export type PenToolbarProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Box<T> = { current: T };
type Point = { x: number; y: number };
type Stroke = { mode: GlobalCompositeOperation; color: string; width: number; points: Point[] };
type ToolSpec = { mode: GlobalCompositeOperation; color: string | null; width: number | null };

const PAD_LABEL = "필기판, 획 %d개";
// pen         source-over     — 있던 그림 위에 그대로 얹는다
// highlighter multiply        — 덮지 않고 곱해서 어둡게 한다. 그래서 아래 글자와 펜 획이 형광 띠를 통해 비친다
// eraser      destination-out — 칠하는 대신 이미 그려진 픽셀의 알파를 깎아낸다
const TOOLS: Record<string, ToolSpec> = {
  pen: { mode: "source-over", color: null, width: null },
  highlighter: { mode: "multiply", color: "#ffd23f", width: 16 },
  eraser: { mode: "destination-out", color: "#000000", width: 20 },
};

function applyRepaint(ctx: CanvasRenderingContext2D, strokes: Stroke[], width: number, height: number): void {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const st of strokes) {
    ctx.globalCompositeOperation = st.mode;
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.beginPath();
    ctx.moveTo(st.points[0].x, st.points[0].y);
    for (let i = 1; i < st.points.length; i++) {
      ctx.lineTo(st.points[i].x, st.points[i].y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

export default function PenToolbar({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: PenToolbarProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]) as Box<Stroke[]>;
  const currentRef = useRef<Stroke | null>(null);
  const [demo, setDemo] = useState(true);
  const [count, setCount] = useState(0);
  const [tool, setTool] = useState("pen");
  const [inkColor, setInkColor] = useState("#17141a");
  const [lineWidth, setLineWidth] = useState(4);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, strokesRef.current, canvas.width, canvas.height);
    setCount(strokesRef.current.length);
  }, [strokesRef]);

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
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const point = toLocal(event);
    const pad = padRef.current;
    if (!point || !pad) return;
    const spec = TOOLS[tool];
    currentRef.current = {
      mode: spec.mode,
      color: spec.color || inkColor,
      width: spec.width || lineWidth,
      points: [point],
    };
    strokesRef.current.push(currentRef.current);
    pad.setPointerCapture(event.pointerId);
    repaint();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const current = currentRef.current;
    if (!current) return;
    const point = toLocal(event);
    if (!point) return;
    current.points.push(point);
    repaint();
  }

  function onWipe(): void {
    setDemo(false);
    strokesRef.current = [];
    repaint();
  }

  function pickTool(value: string): void {
    setDemo(false);
    setTool(value);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const markCls = styles.mark;
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <div className={styles.tools} role="group" aria-label="그리기 도구">
              <button type="button" className={`${styles.tool} ${styles.toolPen}`} aria-pressed={tool === "pen"} onClick={() => pickTool("pen")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z" opacity="0.2"/><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31l83.67-83.66,3.48,13.9-36.8,36.79a8,8,0,0,0,11.31,11.32l40-40a8,8,0,0,0,2.11-7.6l-6.9-27.61L227.32,96A16,16,0,0,0,227.32,73.37ZM48,208V179.31L76.69,208Zm48-3.31L51.31,160,136,75.31,180.69,120Zm96-96L147.32,64l24-24L216,84.69Z"/></svg>
                <span>펜</span><span className={markCls} aria-hidden="true"></span>
              </button>
              <button type="button" className={`${styles.tool} ${styles.toolHl}`} aria-pressed={tool === "highlighter"} onClick={() => pickTool("highlighter")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M136,176,96,216,24,192l64-64Z" opacity="0.2"/><path d="M253.66,106.34a8,8,0,0,0-11.32,0L192,156.69,109.66,74.34h0L107.31,72l50.35-50.34a8,8,0,1,0-11.32-11.32L96,60.69A16,16,0,0,0,93.18,79.5L72,100.69a16,16,0,0,0,0,22.62L76.69,128,18.34,186.34a8,8,0,0,0,3.13,13.25l72,24A7.88,7.88,0,0,0,96,224a8,8,0,0,0,5.66-2.34L136,187.31l4.69,4.69a16,16,0,0,0,22.62,0l21.18-21.18A16,16,0,0,0,203.31,168l50.35-50.34A8,8,0,0,0,253.66,106.34ZM93.84,206.85l-55-18.35L88,139.31,124.69,176ZM152,180.69l-10.34-10.35h0l-48-48h0L83.31,112,104,91.31,172.69,160Z"/></svg>
                <span>형광펜</span><span className={markCls} aria-hidden="true"></span>
              </button>
              <button type="button" className={`${styles.tool} ${styles.toolEr}`} aria-pressed={tool === "eraser"} onClick={() => pickTool("eraser")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M160,168l-48,48H66.75L36.69,185.94a16,16,0,0,1,0-22.63L96,104Z" opacity="0.2"/><path d="M225,80.4,183.6,39a24,24,0,0,0-33.94,0L31,157.66a24,24,0,0,0,0,33.94l30.06,30.06A8,8,0,0,0,66.74,224H216a8,8,0,0,0,0-16h-84.7L225,114.34A24,24,0,0,0,225,80.4ZM108.68,208H70.05L42.33,180.28a8,8,0,0,1,0-11.31L96,115.31,148.69,168Zm105-105L160,156.69,107.31,104,161,50.34a8,8,0,0,1,11.32,0l41.38,41.38a8,8,0,0,1,0,11.31Z"/></svg>
                <span>지우개</span><span className={markCls} aria-hidden="true"></span>
              </button>
            </div>
            <div className={styles.opts}>
              <div className={styles.swatches} role="group" aria-label="펜 색">
                <button type="button" className={`${styles.swatch} ${styles.swatchInk}`} aria-pressed={inkColor === "#17141a"} aria-label="검정 잉크" onClick={() => setInkColor("#17141a")}></button>
                <button type="button" className={`${styles.swatch} ${styles.swatchBlue}`} aria-pressed={inkColor === "#2f6df6"} aria-label="파랑 잉크" onClick={() => setInkColor("#2f6df6")}></button>
                <button type="button" className={`${styles.swatch} ${styles.swatchRed}`} aria-pressed={inkColor === "#c2361a"} aria-label="빨강 잉크" onClick={() => setInkColor("#c2361a")}></button>
              </div>
              <div className={styles.widths} role="group" aria-label="선 굵기">
                <button type="button" className={styles.width} aria-pressed={lineWidth === 2} aria-label="가는 선" onClick={() => setLineWidth(2)}><span className={`${styles.dot} ${styles.dotS}`}></span></button>
                <button type="button" className={styles.width} aria-pressed={lineWidth === 4} aria-label="보통 선" onClick={() => setLineWidth(4)}><span className={`${styles.dot} ${styles.dotM}`}></span></button>
                <button type="button" className={styles.width} aria-pressed={lineWidth === 8} aria-label="굵은 선" onClick={() => setLineWidth(8)}><span className={`${styles.dot} ${styles.dotL}`}></span></button>
              </div>
              <button type="button" className={styles.wipe} onClick={onWipe}>판 비우기</button>
            </div>
          </div>
          <div className={styles.pad} ref={padRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <p className={styles.sample}>여기에 형광펜을 칠해 보세요</p>
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label={PAD_LABEL.replace("%d", String(count))}></canvas>
            <span className={styles.band} aria-hidden="true"></span>
            <svg className={styles.ghost} viewBox="0 0 300 104" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.stroke} pathLength="100" d="M26,84 C70,60 114,96 156,70 C194,46 234,78 274,52"/>
              <rect className={styles.rub} x="-10" y="-7" width="20" height="14" rx="4"/>
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
