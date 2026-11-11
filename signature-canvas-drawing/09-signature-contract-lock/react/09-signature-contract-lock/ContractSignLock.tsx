// ContractSignLock — vanilla 판(run/287/demo/09-signature-contract-lock/index.html) 의 React 포트.
// canvas 2D 로 서명을 받고, 확정을 누르면 서명란에 pointer-events: none 을 주는 클래스를 붙여 잠근 뒤
// toLocaleTimeString 으로 확정 시각을 도장에 적고 aria-live 영역으로 알린다. 값·수치는 vanilla 와 같다.
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import styles from "./ContractSignLock.module.scss";

export type ContractSignLockProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Point = { x: number; y: number };
type Box<T> = { current: T };

const ASK = "서명한 뒤 확정을 눌러 주세요";
const NEED = "먼저 서명을 해 주세요";
const DONE = "서명이 확정되었습니다";

function applyRepaint(ctx: CanvasRenderingContext2D, strokes: Point[][], width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#17141a";
  ctx.lineWidth = 3.2;
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

export default function ContractSignLock({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ContractSignLockProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]) as Box<Point[][]>;
  const currentRef = useRef<Point[] | null>(null);
  const [demo, setDemo] = useState(true);
  const [signState, setSignState] = useState("open");
  const [stamp, setStamp] = useState("");
  const [message, setMessage] = useState(ASK);
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

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    setDemo(false);
    if (signState === "locked") return;
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

  function confirmSign(): void {
    setDemo(false);
    if (!strokesRef.current.length) {
      setMessage(NEED);
      return;
    }
    // 잠금은 상태 하나 — 서명란이 pointer-events: none 이 되어 그 위에 더 못 그린다
    setSignState("locked");
    // 시각 문자열만 화면에 쓴다. 앞뒤 설명은 문구 사전이 바꿀 수 있는 한국어 문장으로 둔다
    setStamp(new Date().toLocaleTimeString());
    setMessage(DONE);
  }

  function signAgain(): void {
    setDemo(false);
    setSignState("open");
    setStamp("");
    strokesRef.current = [];
    repaint();
    setMessage(ASK);
  }

  const locked = signState === "locked";
  const cls = [styles.root, demo ? styles.isDemo : "", locked ? styles.isLocked : ""].filter(Boolean).join(" ");
  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.card}>
          <div className={styles.doc}>
            <p className={styles.docTitle}>제 3 조 서비스 이용</p>
            <p className={styles.docLine}>이용자는 계약 기간 동안 서비스를 이용합니다.</p>
            <p className={styles.docNote}>(화면 설명을 위한 예시이며 실제 약관이 아닙니다)</p>
          </div>
          <div className={styles.pad} ref={padRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
            <p className={styles.hint}>여기에 서명</p>
            <canvas className={styles.ink} ref={canvasRef} role="img" aria-label="계약서 서명란"></canvas>
            <svg className={styles.ghost} viewBox="0 0 300 56" preserveAspectRatio="none" aria-hidden="true">
              <path className={`${styles.stroke} ${styles.strokeA}`} pathLength="100" d="M26,36 C40,10 58,6 64,18 C70,31 54,42 47,36 C40,29 62,13 86,15 C108,16 100,36 116,36 C132,36 134,17 148,17 C162,17 154,37 170,34"/>
              <path className={`${styles.stroke} ${styles.strokeB}`} pathLength="100" d="M162,37 C190,33 216,25 242,13"/>
              <path className={`${styles.stroke} ${styles.strokeC}`} pathLength="100" d="M246,16 C210,40 152,48 92,43"/>
            </svg>
            <span className={styles.rule} aria-hidden="true"></span>
            <div className={styles.cover} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" className={styles.lock}><path d="M216,96V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H208A8,8,0,0,1,216,96Z" opacity="0.2"/><path d="M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z"/></svg>
              <span className={styles.stamp}>
                <span className={styles.stampWord}>확정</span>
                <span className={styles.stampReal}>{stamp}</span>
                <span className={styles.stampDemo}>14:32:07</span>
              </span>
            </div>
          </div>
          <div className={styles.foot}>
            <p className={styles.live}>
              <span className={styles.liveReal} aria-live="polite">{message}</span>
              <span className={`${styles.liveDemo} ${styles.sayAsk}`} aria-hidden="true">서명한 뒤 확정을 눌러 주세요</span>
              <span className={`${styles.liveDemo} ${styles.sayDone}`} aria-hidden="true">서명이 확정되었습니다</span>
            </p>
            <div className={styles.acts}>
              <button type="button" className={`${styles.btn} ${styles.btnConfirm}`} onClick={confirmSign}>서명 확정</button>
              <button type="button" className={`${styles.btn} ${styles.btnAgain}`} onClick={signAgain}>다시 서명</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
