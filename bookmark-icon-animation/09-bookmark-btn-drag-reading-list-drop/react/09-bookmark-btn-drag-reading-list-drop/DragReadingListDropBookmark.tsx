// DragReadingListDropBookmark — vanilla 판(run/416/demo/09-bookmark-btn-drag-reading-list-drop/index.html) 의 React 포트.
// 값 하나: 놓은 지점 - 드롭존 거리 vs BOOKMARK_DRAG_SNAP_PX → 스냅 여부. 이후 관성(감쇠)+정착(lerp) 로 자리를 잡는다.
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import styles from "./DragReadingListDropBookmark.module.scss";

type Box<T> = { current: T };

const BOOKMARK_DRAG_SNAP_PX = 24;
const DRAG_INERTIA_DECAY = 0.86;
const DRAG_SETTLE_RATE = 0.22;
const CYCLE_S = 2;
const DROP_X = 0;
const DROP_Y = 78;

export default function DragReadingListDropBookmark() {
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const chipXRef = useRef<number>(0) as Box<number>;
  const chipYRef = useRef<number>(0) as Box<number>;
  const velXRef = useRef<number>(0) as Box<number>;
  const velYRef = useRef<number>(0) as Box<number>;
  const targetXRef = useRef<number>(0) as Box<number>;
  const targetYRef = useRef<number>(0) as Box<number>;
  const draggingRef = useRef<boolean>(false) as Box<boolean>;
  const lastPXRef = useRef<number>(0) as Box<number>;
  const lastPYRef = useRef<number>(0) as Box<number>;
  const frameRef = useRef<number>(0) as Box<number>;
  const [saved, setSavedState] = useState(false);
  const [status, setStatus] = useState("목록 밖");
  const [near, setNear] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function setSaved(v: boolean): void {
    setSavedState(v);
    setStatus(v ? "저장됨" : "목록 밖");
  }

  function release(): void {
    const dx = chipXRef.current - DROP_X;
    const dy = chipYRef.current - DROP_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= BOOKMARK_DRAG_SNAP_PX) {
      targetXRef.current = DROP_X; targetYRef.current = DROP_Y;
      setSaved(true);
    } else {
      targetXRef.current = 0; targetYRef.current = 0;
      setSaved(false);
    }
  }

  function startDrag(clientX: number, clientY: number): void {
    setDemo(false);
    draggingRef.current = true;
    velXRef.current = 0; velYRef.current = 0;
    lastPXRef.current = clientX; lastPYRef.current = clientY;
  }

  function moveDrag(clientX: number, clientY: number): void {
    const dx = clientX - lastPXRef.current;
    const dy = clientY - lastPYRef.current;
    chipXRef.current += dx; chipYRef.current += dy;
    velXRef.current = dx; velYRef.current = dy;
    lastPXRef.current = clientX; lastPYRef.current = clientY;
  }

  function settle(): void {
    if (draggingRef.current) return;
    if (!reduce) {
      chipXRef.current += velXRef.current;
      chipYRef.current += velYRef.current;
      velXRef.current *= DRAG_INERTIA_DECAY;
      velYRef.current *= DRAG_INERTIA_DECAY;
      chipXRef.current += (targetXRef.current - chipXRef.current) * DRAG_SETTLE_RATE;
      chipYRef.current += (targetYRef.current - chipYRef.current) * DRAG_SETTLE_RATE;
    } else {
      chipXRef.current = targetXRef.current; chipYRef.current = targetYRef.current;
      velXRef.current = 0; velYRef.current = 0;
    }
  }

  function render(): void {
    const chip = chipRef.current;
    if (!chip) return;
    chip.style.transform = "translate(" + chipXRef.current.toFixed(2) + "px, " + chipYRef.current.toFixed(2) + "px)" +
      (draggingRef.current ? " scale(1.06)" : "");
    const isNear = Math.abs(chipXRef.current - DROP_X) < 40 && Math.abs(chipYRef.current - DROP_Y) < 40;
    setNear(isNear && (draggingRef.current || (!saved && targetXRef.current === DROP_X)));
  }

  function synth(t: number, phaseRef: Box<string>): void {
    if (t > 0.1 && t < 0.55 && phaseRef.current === "idle") {
      phaseRef.current = "dragIn";
      draggingRef.current = true;
    }
    if (phaseRef.current === "dragIn") {
      let p = (t - 0.1) / 0.45;
      p = Math.max(0, Math.min(1, p));
      chipXRef.current = DROP_X * p; chipYRef.current = DROP_Y * p;
      if (t >= 0.55) { draggingRef.current = false; phaseRef.current = "afterIn"; release(); }
    }
    if (t > 1.0 && t < 1.4 && phaseRef.current === "afterIn") {
      phaseRef.current = "dragOut";
      draggingRef.current = true;
    }
    if (phaseRef.current === "dragOut") {
      let q = (t - 1.0) / 0.4;
      q = Math.max(0, Math.min(1, q));
      chipXRef.current = DROP_X * (1 - q); chipYRef.current = DROP_Y * (1 - q);
      if (t >= 1.4) { draggingRef.current = false; phaseRef.current = "done"; release(); }
    }
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    const phaseRef: Box<string> = { current: "idle" };
    function loop(now: number): void {
      if (start === 0) start = now;
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { phaseRef.current = "idle"; }
      prevT = t;
      if (!reduce && demo) {
        synth(t, phaseRef);
      }
      settle();
      render();
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo, saved]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>): void {
    event.currentTarget.setPointerCapture(event.pointerId);
    startDrag(event.clientX, event.clientY);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>): void {
    if (draggingRef.current) moveDrag(event.clientX, event.clientY);
  }

  function onPointerUp(): void {
    if (draggingRef.current) { draggingRef.current = false; release(); }
  }

  function onClick(): void {
    if (draggingRef.current) return;
    setDemo(false);
    if (saved) { targetXRef.current = 0; targetYRef.current = 0; setSaved(false); }
    else { targetXRef.current = DROP_X; targetYRef.current = DROP_Y; setSaved(true); }
  }

  const dropCls = [styles.drop, near ? styles.dropNear : "", saved ? styles.dropFilled : ""].filter(Boolean).join(" ");

  return (
    <main className={styles.stage}>
      <div className={styles.dg}>
        <p className={styles.caption}>끌어서 목록에 저장</p>
        <div className={styles.scene}>
          <div className={dropCls} ref={dropRef}>
            <span className={styles.dropLabel}>읽기 목록에 놓기</span>
          </div>
          <button
            className={styles.chip}
            ref={chipRef}
            type="button"
            aria-pressed={saved}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onClick}
          >
            <svg className={styles.icon} viewBox="0 0 24 24" width={26} height={26} aria-hidden="true" focusable="false">
              <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
            </svg>
          </button>
        </div>
        <p className={styles.status} aria-live="polite">{status}</p>
      </div>
    </main>
  );
}
