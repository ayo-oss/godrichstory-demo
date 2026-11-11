import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import styles from "./DragMoveFab.module.scss";

export type DragMoveFabProps = {
  fabLabel?: string;
  leftRead?: string;
  rightRead?: string;
  grabbedRead?: string;
  hint?: string;
  groupLabel?: string;
  /** 붙잡기로 넘어가는 길게 누름 시간(ms) */
  holdMs?: number;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

// ambient 에 KeyboardEvent 가 없다 — 쓰는 필드만 로컬로 선언한다
type KeyEvt = { key: string; currentTarget: HTMLButtonElement };

type Box = { left: number; width: number; maxX: number };

/** 화면 안쪽 여백 — 스냅 자리는 양 끝에서 이만큼 떨어진다 */
const EDGE = 8;

function Dots() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <path d="M224,48V208a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48Z" opacity=".2" />
      <path d="M72,60A12,12,0,1,1,60,48,12,12,0,0,1,72,60Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,128,48Zm68,24a12,12,0,1,0-12-12A12,12,0,0,0,196,72ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,116Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,184a12,12,0,1,0,12,12A12,12,0,0,0,60,184Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,128,184Zm68,0a12,12,0,1,0,12,12A12,12,0,0,0,196,184Z" />
    </svg>
  );
}

export default function DragMoveFab({
  fabLabel = "Move the help button",
  leftRead = "Docked on the left",
  rightRead = "Docked on the right",
  grabbedRead = "Grabbed · release to snap",
  hint = "Press for longer than 350ms, then drag",
  groupLabel = "FAB you press and hold to drag around",
  holdMs = 350,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: DragMoveFabProps) {
  const [tx, setTx] = useState<number | null>(null);   // null 이면 CSS 기본 자리(오른쪽)
  const [grab, setGrab] = useState(false);
  const [holding, setHolding] = useState(false);
  const [live, setLive] = useState(demo);
  const [read, setRead] = useState(rightRead);
  const screenRef = useRef<HTMLDivElement>(null);
  const holdT = useRef<number>(null);

  useEffect(() => () => {
    if (holdT.current !== null) window.clearTimeout(holdT.current);
  }, []);

  function clearHold() {
    if (holdT.current !== null) {
      window.clearTimeout(holdT.current);
      holdT.current = null;
    }
  }

  function bounds(fab: HTMLButtonElement): Box | null {
    const screen = screenRef.current;
    if (!screen) return null;
    const box = screen.getBoundingClientRect();
    return { left: box.left, width: box.width, maxX: box.width - fab.offsetWidth - EDGE };
  }

  // 길게 누름이 채워져야 붙잡기로 넘어간다 — 짧은 누름은 그냥 클릭이다
  function down(e: PointerEvent<HTMLButtonElement>) {
    setLive(false);
    const fab = e.currentTarget;
    const pid: number = e.pointerId;
    clearHold();
    holdT.current = window.setTimeout(() => {
      setGrab(true);
      setHolding(true);
      try { fab.setPointerCapture(pid); } catch { /* 캡처를 못 해도 끌기는 된다 */ }
      setRead(grabbedRead);
    }, holdMs);
  }

  function move(e: PointerEvent<HTMLButtonElement>) {
    if (!grab) return;
    const fab = e.currentTarget;
    const b = bounds(fab);
    if (!b) return;
    setTx(Math.min(Math.max(e.clientX - b.left - fab.offsetWidth / 2, 0), b.maxX));
  }

  // 놓으면 가까운 가장자리로 스냅된다
  function up(e: PointerEvent<HTMLButtonElement>) {
    clearHold();
    setHolding(false);
    if (!grab) return;
    setGrab(false);
    const b = bounds(e.currentTarget);
    if (!b) return;
    const left = e.clientX < b.left + b.width / 2;
    setTx(left ? 0 : b.maxX);
    setRead(left ? leftRead : rightRead);
  }

  // 키보드 경로 — vanilla 판은 transform 만 바꾸지만 읽어주는 문구도 같이 맞춘다
  function key(e: KeyEvt) {
    setLive(false);
    const b = bounds(e.currentTarget);
    if (!b) return;
    if (e.key === "ArrowLeft") { setTx(0); setRead(leftRead); }
    if (e.key === "ArrowRight") { setTx(b.maxX); setRead(rightRead); }
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const fabStyle: CSSProperties = tx === null ? {} : { transform: `translateX(${tx}px)` };
  const cls = [styles.dg, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const screenCls = [styles.screen, holding ? styles.isHolding : ""].filter(Boolean).join(" ");
  const fabCls = [styles.fab, grab ? styles.isGrab : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <div className={screenCls} ref={screenRef}>
        <span className={[styles.guide, styles.guideL].join(" ")} aria-hidden="true" />
        <span className={[styles.guide, styles.guideR].join(" ")} aria-hidden="true" />
        <p className={styles.read} aria-live="polite">{read}</p>
        <button
          className={fabCls}
          style={fabStyle}
          type="button"
          aria-label={fabLabel}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onKeyDown={key}
        >
          <span aria-hidden="true"><Dots /></span>
        </button>
      </div>
      <p className={styles.hint}>{hint}</p>
    </section>
  );
}
