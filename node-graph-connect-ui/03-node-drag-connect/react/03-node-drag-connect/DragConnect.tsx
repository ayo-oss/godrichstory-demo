import { useEffect, useRef, useState } from "react";
import styles from "./DragConnect.module.scss";

export type DragConnectProps = { duration?: number; easing?: string; color?: string };

// ambient 에 React 이벤트 제네릭이 없다 — 쓰는 필드만 적은 로컬 타입
type PointerEvt = {
  clientX: number; clientY: number; pointerId: number;
  currentTarget: { setPointerCapture(id: number): void };
  preventDefault(): void;
};
type KeyEvt = { key: string; preventDefault(): void };
type Point = { x: number; y: number };

const VIEW_W = 400;                 // viewBox 가로 — 화면 px 를 이 좌표계로 되돌릴 때 쓴다
const SNAP = 28;                    // 받는 점 중심에서 이 거리 안이면 달라붙는다
const OUT: Point = { x: 140, y: 53 };
const IN: Point = { x: 248, y: 123 };

// 손잡이는 두 점의 가로 거리의 절반, 최소 40
function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const h = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + h},${y1} ${x2 - h},${y2} ${x2},${y2}`;
}

const FULL = wirePath(OUT.x, OUT.y, IN.x, IN.y);

export default function DragConnect({
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: DragConnectProps) {
  const [demo, setDemo] = useState(true);
  const [temp, setTemp] = useState("");
  const [near, setNear] = useState(false);
  const [armed, setArmed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [len, setLen] = useState(0);

  const svgRef = useRef<SVGSVGElement>(null);
  const tempRef = useRef<SVGPathElement>(null);
  const inRef = useRef<SVGCircleElement>(null);
  const dragRef = useRef<boolean>(false);
  const snapRef = useRef<boolean>(false);

  useEffect(() => {
    const el = tempRef.current;
    if (el) setLen(el.getTotalLength());   // 미리보기 루프가 쓸 선 길이
  }, []);

  // 화면 좌표 → viewBox 좌표. 무대가 줄어도 배율 하나로 되돌린다
  const local = (e: PointerEvt): Point => {
    const el = svgRef.current;
    if (!el) return { x: 0, y: 0 };
    const box = el.getBoundingClientRect();
    const k = VIEW_W / box.width;
    return { x: (e.clientX - box.left) * k, y: (e.clientY - box.top) * k };
  };

  const drawTo = (p: Point) => {
    const gap = Math.sqrt((p.x - IN.x) * (p.x - IN.x) + (p.y - IN.y) * (p.y - IN.y));
    const hit = gap < SNAP;
    snapRef.current = hit;
    setNear(hit);
    const end = hit ? IN : p;
    setTemp(wirePath(OUT.x, OUT.y, end.x, end.y));
  };

  const stop = () => {
    dragRef.current = false;
    setTemp(""); setNear(false); setArmed(false);
  };

  const onDown = (e: PointerEvt) => {
    e.preventDefault();
    setDemo(false);
    e.currentTarget.setPointerCapture(e.pointerId);   // 손가락이 포트를 벗어나도 이 점이 계속 받는다
    dragRef.current = true; snapRef.current = false;
    drawTo(local(e));
  };

  const onMove = (e: PointerEvt) => { if (dragRef.current) drawTo(local(e)); };

  const onUp = () => {
    if (!dragRef.current) return;
    if (snapRef.current) setConnected(true);
    stop();
  };

  const onOutKey = (e: KeyEvt) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    setDemo(false); setArmed(true); setNear(true);
    const el = inRef.current;
    if (el) el.focus({ preventScroll: true });
  };

  const onInKey = (e: KeyEvt) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (armed) { setConnected(true); stop(); }
  };

  const loop = (name: string, timing: string) => (demo
    ? {
        animationName: name,
        animationDuration: `${duration}ms`,
        animationTimingFunction: timing,
        animationIterationCount: "infinite",
        animationFillMode: "backwards",
      }
    : {});

  return (
    <main className={styles.stage}>
      <div className={styles.ng}>
        <svg ref={svgRef} className={styles.svg} viewBox="0 0 400 176" role="group" aria-label="두 노드를 끌어서 잇는 화면">

          <path
            className={styles.wire}
            fill="none"
            d={FULL}
            style={{ stroke: color, opacity: demo ? undefined : (connected ? 1 : 0), ...loop("ngCommit", "steps(1, end)") }}
          />
          <path
            ref={tempRef}
            className={styles.temp}
            fill="none"
            d={demo ? FULL : (temp || FULL)}
            style={{
              opacity: demo ? undefined : (temp ? 1 : 0),
              ...(demo ? { strokeDasharray: len || undefined, "--len": len } : {}),
              ...loop("ngTempDraw", "linear"),
            }}
          />

          <g className={styles.node}>
            <rect x="16" y="26" width="124" height="54" rx="12"/>
            <svg x="30" y="43" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M200,56H56A24,24,0,0,0,32,80V192a24,24,0,0,0,24,24H200a24,24,0,0,0,24-24V80A24,24,0,0,0,200,56ZM164,184H92a20,20,0,0,1,0-40h72a20,20,0,0,1,0,40Z" opacity="0.2"/><path d="M200,48H136V16a8,8,0,0,0-16,0V48H56A32,32,0,0,0,24,80V192a32,32,0,0,0,32,32H200a32,32,0,0,0,32-32V80A32,32,0,0,0,200,48Zm16,144a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V80A16,16,0,0,1,56,64H200a16,16,0,0,1,16,16ZM72,108a12,12,0,1,1,12,12A12,12,0,0,1,72,108Zm88,0a12,12,0,1,1,12,12A12,12,0,0,1,160,108Zm4,28H92a28,28,0,0,0,0,56h72a28,28,0,0,0,0-56Zm-24,16v24H116V152ZM80,164a12,12,0,0,1,12-12h8v24H92A12,12,0,0,1,80,164Zm84,12h-8V152h8a12,12,0,0,1,0,24Z"/></svg>
            <text className={styles.nm} x="58" y="53">AI 요약</text>
          </g>

          <g className={styles.node}>
            <rect x="248" y="96" width="124" height="54" rx="12"/>
            <svg x="262" y="113" width="20" height="20" viewBox="0 0 256 256" fill="currentColor" className={styles.ico} aria-hidden="true"><path d="M223.69,42.18l-58.22,192a8,8,0,0,1-14.92,1.25L108,148,20.58,105.45a8,8,0,0,1,1.25-14.92l192-58.22A8,8,0,0,1,223.69,42.18Z" opacity="0.2"/><path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"/></svg>
            <text className={styles.nm} x="288" y="123">알림 보내기</text>
          </g>

          <circle
            className={`${styles.port} ${styles.portOut} ${armed ? styles.isArmed : ""}`}
            cx="140" cy="53" r="7" role="button" tabIndex={0} aria-label="보내는 점"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={stop}
            onKeyDown={onOutKey}
            onFocus={() => setDemo(false)}
          />
          <circle
            ref={inRef}
            className={`${styles.port} ${styles.portIn} ${near ? styles.isNear : ""}`}
            cx="248" cy="123" r="7" role="button" tabIndex={0} aria-label="받는 점"
            style={loop("ngSnap", "cubic-bezier(.2, 1.4, .4, 1)")}
            onKeyDown={onInKey}
            onFocus={() => setDemo(false)}
          />

          <g className={styles.cursor} aria-hidden="true" style={loop("ngCursorMove", easing)}>
            <svg x="0" y="0" width="26" height="26" viewBox="0 0 256 256" fill="currentColor"><path d="M213.66,201,201,213.66a8,8,0,0,1-11.31,0l-51.31-51.31a8,8,0,0,0-13,2.46l-17.82,46.41a8,8,0,0,1-14.85-.71L40.41,50.44a8,8,0,0,1,10-10L210.51,92.68a8,8,0,0,1,.71,14.85l-46.41,17.82a8,8,0,0,0-2.46,13l51.31,51.31A8,8,0,0,1,213.66,201Z" opacity="0.2"/><path d="M168,132.69,214.08,115l.33-.13A16,16,0,0,0,213,85.07L52.92,32.8A15.95,15.95,0,0,0,32.8,52.92L85.07,213a15.82,15.82,0,0,0,14.41,11l.78,0a15.84,15.84,0,0,0,14.61-9.59l.13-.33L132.69,168,184,219.31a16,16,0,0,0,22.63,0l12.68-12.68a16,16,0,0,0,0-22.63ZM195.31,208,144,156.69a16,16,0,0,0-26,4.93c0,.11-.09.22-.13.32l-17.65,46L48,48l159.85,52.2-45.95,17.64-.32.13a16,16,0,0,0-4.93,26h0L208,195.31Z"/></svg>
          </g>

          <text className={styles.hint} x="200" y="168" textAnchor="middle" aria-live="polite">
            {connected ? "이어졌습니다" : "점을 끌어 이어 보세요"}
          </text>
        </svg>
      </div>
    </main>
  );
}
