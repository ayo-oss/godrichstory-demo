// GridSnapCanvas — vanilla 판(run/287/demo/04-canvas-grid-snap/index.html) 의 React 포트.
// 클릭한 점을 Math.round 로 가장 가까운 눈금 교차점에 붙여 폴리라인으로 잇고, 붙은 자리마다 작은 표식을 그린다.
// 판 바탕의 눈금은 CSS repeating-linear-gradient 두 겹이고 칸 수(COLS·ROWS)는 양쪽이 같은 값을 쓴다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./GridSnapCanvas.module.scss";

export type GridSnapCanvasProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = { x: number; y: number };
// useRef 는 T | null 을 돌려준다. 처음부터 값이 있고 절대 비지 않는 상자는 이렇게 좁혀 쓴다
type Box<T> = { current: T };

const COLS = 12;
const ROWS = 4;
const PAD_LABEL = "배치도 칸, 점 %d개";
const LIVE_LABEL = "눈금에 맞추기 %s, 점 %d개";

function applyRepaint(ctx: CanvasRenderingContext2D, points: Point[], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#17141a";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      ctx.moveTo(points[i].x, points[i].y);
    } else {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#2f6df6";
  ctx.lineWidth = 1.6;
  for (const p of points) {   // 붙은 자리마다 작은 표식
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

export default function GridSnapCanvas({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: GridSnapCanvasProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<Point[]>([]) as Box<Point[]>;
  const [demo, setDemo] = useState(true);
  const [snap, setSnap] = useState(true);
  const [count, setCount] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, pointsRef.current, canvas.width, canvas.height);
    setCount(pointsRef.current.length);
  }, []);

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

  // 스냅이 켜져 있으면 가장 가까운 교차점으로 붙인다 — 반올림 한 번이 전부다
  function snapPoint(p: Point): Point {
    const board = boardRef.current;
    if (!snap || !board) return p;
    const r = board.getBoundingClientRect();
    const stepX = r.width / COLS;
    const stepY = r.height / ROWS;
    return { x: Math.round(p.x / stepX) * stepX, y: Math.round(p.y / stepY) * stepY };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    const canvas = inkRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    pointsRef.current.push(snapPoint({ x: event.clientX - r.left, y: event.clientY - r.top }));
    repaint();
  }

  function onToggleSnap(): void {
    setDemo(false);
    setSnap(!snap);
  }

  function onClear(): void {
    pointsRef.current = [];
    repaint();
  }

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <button type="button" className={styles.snap} aria-pressed={snap} onClick={onToggleSnap}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M208,56V200a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H200A8,8,0,0,1,208,56Z" opacity="0.2"/><path d="M200,40H56A16,16,0,0,0,40,56V200a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,80H136V56h64ZM120,56v64H56V56ZM56,136h64v64H56Zm144,64H136V136h64v64Z"/></svg>
              <span>눈금에 맞추기</span>
              <span className={styles.pill} aria-hidden="true"><span className={styles.knob}></span></span>
            </button>
            <button type="button" className={styles.btn} onClick={onClear}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M160,168l-48,48H66.75L36.69,185.94a16,16,0,0,1,0-22.63L96,104Z" opacity="0.2"/><path d="M225,80.4,183.6,39a24,24,0,0,0-33.94,0L31,157.66a24,24,0,0,0,0,33.94l30.06,30.06A8,8,0,0,0,66.74,224H216a8,8,0,0,0,0-16h-84.7L225,114.34A24,24,0,0,0,225,80.4ZM108.68,208H70.05L42.33,180.28a8,8,0,0,1,0-11.31L96,115.31,148.69,168Zm105-105L160,156.69,107.31,104,161,50.34a8,8,0,0,1,11.32,0l41.38,41.38a8,8,0,0,1,0,11.31Z"/></svg>
              <span>판 비우기</span>
            </button>
          </div>
          <div className={styles.board} ref={boardRef} onPointerDown={onPointerDown}>
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label={PAD_LABEL.replace("%d", String(count))}></canvas>
            <svg className={styles.ghost} viewBox="0 0 300 104" preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.line} pathLength="100" d="M50,78 L50,26 L125,26 L125,52 L200,52 L200,78 L250,78"/>
              <path className={styles.diag} pathLength="100" d="M25,78 L275,26"/>
              <circle className={`${styles.ring} ${styles.ring1}`} cx="50" cy="78" r="5"/>
              <circle className={`${styles.ring} ${styles.ring2}`} cx="50" cy="26" r="5"/>
              <circle className={`${styles.ring} ${styles.ring3}`} cx="125" cy="26" r="5"/>
              <circle className={`${styles.ring} ${styles.ring4}`} cx="125" cy="52" r="5"/>
              <circle className={`${styles.ring} ${styles.ring5}`} cx="200" cy="52" r="5"/>
              <circle className={`${styles.ring} ${styles.ring6}`} cx="200" cy="78" r="5"/>
              <circle className={`${styles.ring} ${styles.ring7}`} cx="250" cy="78" r="5"/>
            </svg>
          </div>
          <p className={styles.live}>
            <span className={styles.liveReal} aria-live="polite">
              {LIVE_LABEL.replace("%s", snap ? "켬" : "끔").replace("%d", String(count))}
            </span>
            <span className={`${styles.liveDemo} ${styles.liveOff}`} aria-hidden="true">눈금에 맞추기 끔</span>
            <span className={`${styles.liveDemo} ${styles.liveOn}`} aria-hidden="true">눈금에 맞추기 켬</span>
          </p>
        </div>
      </div>
    </main>
  );
}
