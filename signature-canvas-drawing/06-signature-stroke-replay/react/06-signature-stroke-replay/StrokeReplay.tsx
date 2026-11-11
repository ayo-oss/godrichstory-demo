// StrokeReplay — vanilla 판(run/287/demo/06-signature-stroke-replay/index.html) 의 React 포트.
// 사람이 그은 획은 canvas 2D 가 그리고, 「다시 재생」을 누르면 좌표 배열을 SVG path 의 d 로 옮겨
// getTotalLength() 로 길이를 잰 뒤 stroke-dasharray / stroke-dashoffset 을 그 길이로 놓고
// transition 으로 0 까지 내린다. 값·수치·키프레임은 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./StrokeReplay.module.scss";

export type StrokeReplayProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = { x: number; y: number };
// useRef 는 T | null 을 돌려주므로, 초기값이 있는 상자는 이 타입으로 좁혀 쓴다
type Box<T> = { current: T };

const SVG_NS = "http://www.w3.org/2000/svg";
const PAD_LABEL = "서명 칸, 획 %d개";
const COUNT_LABEL = "획 %d개";
const REPLAY_LABEL = "1번 획부터 다시 그립니다";

// 좌표 배열을 SVG path 의 d 로 — canvas 가 그린 곡선과 같은 모양이 된다
function toPathData(pts: Point[]): string {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = ((pts[i].x + pts[i - 1].x) / 2).toFixed(1);
    const cy = ((pts[i].y + pts[i - 1].y) / 2).toFixed(1);
    d += ` Q${pts[i - 1].x.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${cx},${cy}`;
  }
  return d;
}

function applyRepaint(ctx: CanvasRenderingContext2D, strokes: Point[][], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#17141a";
  for (const pts of strokes) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      // 두 점의 중점을 제어점으로 삼아 꺾임을 둥글게 잇는다 — SVG 로 옮길 때도 같은 식이다
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, (pts[i].x + pts[i - 1].x) / 2, (pts[i].y + pts[i - 1].y) / 2);
    }
    ctx.stroke();
  }
}

export default function StrokeReplay({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: StrokeReplayProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const inkRef = useRef<HTMLCanvasElement | null>(null);
  const playRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<Point[][]>([]) as Box<Point[][]>;
  const currentRef = useRef<Point[] | null>(null);
  const timersRef = useRef<number[]>([]) as Box<number[]>;
  const [demo, setDemo] = useState(true);
  const [count, setCount] = useState(0);
  const [litCount, setLitCount] = useState(0);
  const [message, setMessage] = useState(COUNT_LABEL.replace("%d", "0"));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const repaint = useCallback(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyRepaint(ctx, strokesRef.current, canvas.width, canvas.height);
    setCount(strokesRef.current.length);
    setMessage(COUNT_LABEL.replace("%d", String(strokesRef.current.length)));
  }, []);

  // 고DPI 대응 — 배킹 스토어를 devicePixelRatio 배로 키우고 좌표계는 CSS 픽셀 그대로 쓴다
  const resize = useCallback(() => {
    const pad = padRef.current;
    const canvas = inkRef.current;
    const play = playRef.current;
    if (!pad || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = pad.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (play) play.setAttribute("viewBox", `0 0 ${Math.round(r.width)} ${Math.round(r.height)}`);
    repaint();
  }, [repaint]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const finishReplay = useCallback(() => {
    const canvas = inkRef.current;
    const play = playRef.current;
    if (canvas) canvas.style.visibility = "";
    if (play) play.textContent = "";
    setLitCount(strokesRef.current.length);
    setMessage(COUNT_LABEL.replace("%d", String(strokesRef.current.length)));
  }, []);

  const replay = useCallback(() => {
    const canvas = inkRef.current;
    const play = playRef.current;
    const strokes = strokesRef.current;
    if (!canvas || !play || !strokes.length || currentRef.current) return;
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    play.textContent = "";
    canvas.style.visibility = "hidden";
    setLitCount(0);
    let delay = 0;
    const paths: SVGPathElement[] = [];
    strokes.forEach((pts, index) => {
      const path = document.createElementNS(SVG_NS, "path") as SVGPathElement;
      path.setAttribute("class", styles.trace);
      path.setAttribute("d", toPathData(pts));
      play.appendChild(path);
      // 길이를 재서 그 길이만큼의 점선 한 칸을 만들고 칸을 통째로 밀어 두면 선이 사라진다
      const len = path.getTotalLength();
      const ms = Math.max(240, Math.round(len * 2.4));
      path.style.setProperty("stroke-dasharray", `${len}px`);
      path.style.setProperty("stroke-dashoffset", `${len}px`);
      path.style.setProperty("transition", `stroke-dashoffset ${ms}ms linear ${delay}ms`);
      paths.push(path);
      const at = delay;
      timersRef.current.push(window.setTimeout(() => setLitCount(index + 1), at));
      delay += ms + 120;
    });
    // 방금 붙인 값으로 레이아웃을 한 번 계산시킨다 — 그래야 transition 이 처음 값부터 출발한다
    play.getBoundingClientRect();
    for (const path of paths) path.style.setProperty("stroke-dashoffset", "0px");
    setMessage(REPLAY_LABEL);
    timersRef.current.push(window.setTimeout(finishReplay, delay + 200));
  }, [finishReplay]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    };
  }, []);

  function toLocal(event: ReactPointerEvent<HTMLDivElement>): Point | null {
    const canvas = inkRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    finishReplay();
    const point = toLocal(event);
    const pad = padRef.current;
    if (!point || !pad) return;
    currentRef.current = [point];
    strokesRef.current.push(currentRef.current);
    setCount(strokesRef.current.length);
    setLitCount(strokesRef.current.length);
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

  function onPointerUp(): void {
    currentRef.current = null;
    setLitCount(strokesRef.current.length);
  }

  function onReplayClick(): void {
    setDemo(false);
    replay();
  }

  const badges = demo
    ? [styles.stepA, styles.stepB, styles.stepC].map((mod, i) => (
        <span key={i} className={`${styles.step} ${mod}`}>{i + 1}</span>
      ))
    : Array.from({ length: count }, (_, i) => i).map((i) => (
        <span key={i} className={`${styles.step} ${i < litCount ? styles.isOn : ""}`}>{i + 1}</span>
      ));

  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.bar}>
            <div className={styles.order}>
              <span className={styles.orderLabel}>획 순서</span>
              <div className={styles.steps}>{badges}</div>
            </div>
            <button type="button" className={styles.btn} onClick={onReplayClick}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z" opacity="0.2"/><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z"/></svg>
              <span>다시 재생</span>
            </button>
          </div>
          <div
            className={styles.pad}
            ref={padRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <canvas className={styles.ink} ref={inkRef} role="img" aria-label={PAD_LABEL.replace("%d", String(count))}></canvas>
            <svg className={styles.play} ref={playRef} viewBox="0 0 300 96" aria-hidden="true"></svg>
            <svg className={styles.ghost} viewBox="0 0 300 96" preserveAspectRatio="none" aria-hidden="true">
              <path className={`${styles.stroke} ${styles.strokeA}`} pathLength="100" d="M24,70 C30,34 44,18 56,26 C68,34 52,62 44,70 C36,78 60,74 76,58 C92,42 96,26 108,30 C120,34 106,66 120,70"/>
              <path className={`${styles.stroke} ${styles.strokeB}`} pathLength="100" d="M126,66 C140,44 152,32 164,40 C176,48 160,70 172,72 C184,74 196,58 204,44"/>
              <path className={`${styles.stroke} ${styles.strokeC}`} pathLength="100" d="M212,34 C244,36 268,52 272,64 C276,76 240,84 176,82 C112,80 52,78 30,84"/>
            </svg>
            <span className={styles.rule} aria-hidden="true"></span>
          </div>
          <p className={styles.live}>
            <span className={styles.liveReal} aria-live="polite">{message}</span>
            <span className={styles.liveDemo} aria-hidden="true">그은 순서대로 다시 그립니다</span>
          </p>
        </div>
      </div>
    </main>
  );
}
