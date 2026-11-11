// SketchInkLayers — vanilla 판(run/287/demo/05-canvas-layer-ink/index.html) 의 React 포트.
// canvas 두 장을 겹친다 — 밑그림 판은 globalAlpha 를 낮춘 안내선을 미리 깔고, 활성 레이어에만 포인터 궤적을 그린다.
// 슬라이더는 밑그림 판의 CSS opacity 만 바꾸고, 「두 장 합치기」는 drawImage 로 밑그림을 잉크 판에 눌러 담는다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./SketchInkLayers.module.scss";

export type SketchInkLayersProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const GUIDE_ALPHA = 0.55;   // 밑그림 잉크 자체의 진하기 — canvas 안에서 한 번, CSS opacity 로 또 한 번 겹쳐 옅어진다
const DEFAULT_OPACITY = 0.34;

function applyGuide(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // 미리보기 SVG 와 같은 300×88 좌표계로 그린다 — 판 폭이 변해도 모양 비율이 유지된다
  const s = width / 300;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(s, s);
  ctx.globalAlpha = GUIDE_ALPHA;
  ctx.strokeStyle = "#17141a";
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(40, 70);
  ctx.bezierCurveTo(60, 18, 110, 14, 130, 46);
  ctx.bezierCurveTo(150, 78, 190, 80, 210, 54);
  ctx.bezierCurveTo(226, 33, 250, 26, 268, 36);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(130, 46, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(36, 78);
  ctx.lineTo(264, 78);
  ctx.stroke();
  ctx.restore();
}

export default function SketchInkLayers({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: SketchInkLayersProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const sketchRef = useRef<HTMLCanvasElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [demo, setDemo] = useState(true);
  const [active, setActive] = useState("ink");
  const [fade, setFade] = useState(34);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const activeCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = active === "sketch" ? sketchRef.current : inkRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, [active]);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const r = board.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [sketchRef.current, inkRef.current]) {
      if (!canvas) continue;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const sketch = sketchRef.current;
    const sketchCtx = sketch ? sketch.getContext("2d") : null;
    if (sketchCtx) applyGuide(sketchCtx, r.width, r.height);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    function onUp(): void {
      drawingRef.current = false;
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, []);

  function toLocal(event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } | null {
    const canvas = inkRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const board = boardRef.current;
    const ctx = activeCtx();
    const p = toLocal(event);
    if (!board || !ctx || !p) return;
    drawingRef.current = true;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = active === "sketch" ? GUIDE_ALPHA : 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = active === "sketch" ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    board.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!drawingRef.current) return;
    const ctx = activeCtx();
    const p = toLocal(event);
    if (!ctx || !p) return;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function onFade(event: { target: EventTarget | null }): void {
    setDemo(false);
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const value = Number(input.value);
    setFade(value);
    const sketch = sketchRef.current;
    if (sketch) sketch.style.opacity = String(value / 100);
  }

  // 두 장 합치기 — 밑그림 판을 지금 보이는 진하기 그대로 잉크 판에 눌러 담고 밑그림 판을 비운다
  function onMerge(): void {
    setDemo(false);
    const sketch = sketchRef.current;
    const ink = inkRef.current;
    if (!sketch || !ink) return;
    const inkCtx = ink.getContext("2d");
    if (!inkCtx) return;
    inkCtx.save();
    inkCtx.setTransform(1, 0, 0, 1, 0, 0);
    inkCtx.globalAlpha = sketch.style.opacity ? Number(sketch.style.opacity) : DEFAULT_OPACITY;
    inkCtx.drawImage(sketch, 0, 0);
    inkCtx.restore();
    const sketchCtx = sketch.getContext("2d");
    if (sketchCtx) sketchCtx.clearRect(0, 0, sketch.width, sketch.height);
  }

  function onLayer(name: string): void {
    setDemo(false);
    setActive(name);
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.layers}>
            <div className={styles.row}>
              <button type="button" className={styles.layer} aria-pressed={active === "sketch"} onClick={() => onLayer("sketch")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"/><path d="M96.26,37A8,8,0,0,1,102,27.29a104.11,104.11,0,0,1,52,0,8,8,0,0,1-2,15.75,8.15,8.15,0,0,1-2-.26,88.09,88.09,0,0,0-44,0A8,8,0,0,1,96.26,37ZM53.79,55.14a104,104,0,0,0-26,45,8,8,0,1,0,15.42,4.26,87.91,87.91,0,0,1,22-38.08A8,8,0,0,0,53.79,55.14ZM43.21,151.55a8,8,0,1,0-15.42,4.28,104,104,0,0,0,26,45,8,8,0,1,0,11.41-11.21A88.14,88.14,0,0,1,43.21,151.55ZM150,213.22a88,88,0,0,1-44,0,8,8,0,1,0-4,15.49,104.11,104.11,0,0,0,52,0,8,8,0,0,0-4-15.49ZM222.65,146a8,8,0,0,0-9.85,5.57,87.88,87.88,0,0,1-22,38.09,8,8,0,1,0,11.42,11.21,104.05,104.05,0,0,0,26-45A8,8,0,0,0,222.65,146Zm-9.86-41.54a8,8,0,0,0,15.42-4.28,104,104,0,0,0-26-45,8,8,0,1,0-11.41,11.21A88.14,88.14,0,0,1,212.79,104.45Z"/></svg>
                <span>밑그림</span>
              </button>
              <span className={styles.slot}>
                <input className={styles.range} type="range" min="0" max="100" value={fade} aria-label="밑그림 불투명도" onChange={onFade}></input>
                <span className={styles.fake} aria-hidden="true"><span className={styles.fakeFill}></span><span className={styles.fakeKnob}></span></span>
              </span>
            </div>
            <div className={styles.row}>
              <button type="button" className={styles.layer} aria-pressed={active === "ink"} onClick={() => onLayer("ink")}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z" opacity="0.2"/><path d="M227.32,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31l83.67-83.66,3.48,13.9-36.8,36.79a8,8,0,0,0,11.31,11.32l40-40a8,8,0,0,0,2.11-7.6l-6.9-27.61L227.32,96A16,16,0,0,0,227.32,73.37ZM48,208V179.31L76.69,208Zm48-3.31L51.31,160,136,75.31,180.69,120Zm96-96L147.32,64l24-24L216,84.69Z"/></svg>
                <span>잉크</span>
              </button>
              <button type="button" className={styles.merge} onClick={onMerge}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M224,80l-96,56L32,80l96-56Z" opacity="0.2"/><path d="M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z"/></svg>
                <span>두 장 합치기</span>
              </button>
            </div>
          </div>
          <div className={styles.board} ref={boardRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <canvas className={styles.sketch} ref={sketchRef} role="img" aria-label="밑그림 판" style={{ opacity: fade / 100 }}></canvas>
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label="잉크 판"></canvas>
            <svg className={styles.ghost} viewBox="0 0 300 88" preserveAspectRatio="none" aria-hidden="true">
              <g className={styles.guide}>
                <path className={styles.guideCurve} d="M40,70 C60,18 110,14 130,46 C150,78 190,80 210,54 C226,33 250,26 268,36"/>
                <circle className={styles.guideRing} cx="130" cy="46" r="26"/>
                <line className={styles.guideBase} x1="36" y1="78" x2="264" y2="78"/>
              </g>
              <path className={styles.trace} pathLength="100" d="M40,70 C60,18 110,14 130,46 C150,78 190,80 210,54 C226,33 250,26 268,36"/>
              <line className={styles.finish} pathLength="100" x1="36" y1="78" x2="264" y2="78"/>
            </svg>
          </div>
        </div>
      </div>
    </main>
  );
}
