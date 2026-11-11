// ToastConfirmSlideBookmark — vanilla 판(run/416/demo/07-bookmark-btn-toast-confirm-slide/index.html) 의 React 포트.
// 값 하나: 토스트가 뜬 뒤 경과 시간(rAF now 기준) → 진입/유지/퇴장 세 구간 중 어디인지, 그 구간의 진행률.
import { useEffect, useRef, useState } from "react";
import styles from "./ToastConfirmSlideBookmark.module.scss";

type Box<T> = { current: T };

const TOAST_ENTER_MS = 180;
const TOAST_HOLD_MS = 520;
const TOAST_EXIT_MS = 180;
const CYCLE_S = 2;

export default function ToastConfirmSlideBookmark() {
  const toastRef = useRef<HTMLDivElement | null>(null);
  const toastTextRef = useRef<HTMLSpanElement | null>(null);
  const toastStartRef = useRef<number | null>(null);
  const pendingMsgRef = useRef<string | null>(null);
  const frameRef = useRef<number>(0) as Box<number>;
  const [pressed, setPressed] = useState(false);
  const [demo, setDemo] = useState(true);
  const [reduce, setReduce] = useState(false);

  function showToast(now: number, msg: string): void {
    if (toastTextRef.current) toastTextRef.current.textContent = msg;
    toastStartRef.current = now;
  }

  function render(now: number): void {
    const toast = toastRef.current;
    if (!toast) return;
    if (toastStartRef.current === null) {
      toast.style.transform = "translateY(120%)";
      toast.style.opacity = "0";
      return;
    }
    const elapsed = now - toastStartRef.current;
    const enterMs = reduce ? 1 : TOAST_ENTER_MS;
    const exitMs = reduce ? 1 : TOAST_EXIT_MS;
    const enterEnd = enterMs;
    const holdEnd = enterEnd + TOAST_HOLD_MS;
    const exitEnd = holdEnd + exitMs;
    let y: number;
    let op: number;
    if (elapsed < enterEnd) {
      const p = elapsed / enterEnd;
      const eased = 1 - Math.pow(1 - p, 3);
      y = 120 - eased * 120;
      op = eased;
    } else if (elapsed < holdEnd) {
      y = 0; op = 1;
    } else if (elapsed < exitEnd) {
      const q = (elapsed - holdEnd) / exitMs;
      const easedQ = Math.pow(q, 2);
      y = easedQ * 120;
      op = 1 - easedQ;
    } else {
      y = 120; op = 0;
      toastStartRef.current = null;
    }
    toast.style.transform = "translateY(" + y.toFixed(2) + "%)";
    toast.style.opacity = op.toFixed(3);
  }

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    let start = 0;
    let prevT = 0;
    let toggledA = false;
    let toggledB = false;
    function loop(now: number): void {
      if (start === 0) start = now;
      if (pendingMsgRef.current) { showToast(now, pendingMsgRef.current); pendingMsgRef.current = null; }
      const t = ((now - start) / 1000) % CYCLE_S;
      if (t < prevT) { toggledA = false; toggledB = false; }
      prevT = t;
      if (!reduce && demo) {
        if (!toggledA && t > 0.05) {
          toggledA = true; setPressed(true);
          showToast(now, "저장했어요");
        }
        if (!toggledB && t > 1.05) {
          toggledB = true; setPressed(false);
          showToast(now, "저장을 취소했어요");
        }
      }
      render(now);
      frameRef.current = requestAnimationFrame(loop);
    }
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reduce, demo]);

  function onClick(): void {
    setDemo(false);
    const v = !pressed;
    setPressed(v);
    pendingMsgRef.current = v ? "저장했어요" : "저장을 취소했어요";
  }

  return (
    <main className={styles.stage}>
      <div className={styles.ts}>
        <p className={styles.caption}>저장 완료 알림</p>
        <div className={styles.scene}>
          <button className={styles.btn} type="button" aria-pressed={pressed} onClick={onClick}>
            <svg className={styles.icon} viewBox="0 0 24 24" width={30} height={30} aria-hidden="true" focusable="false">
              <path className={styles.shape} d="M6.5 3A1.5 1.5 0 0 1 8 1.5h8A1.5 1.5 0 0 1 17.5 3v18.2a.9.9 0 0 1-1.38.76L12 19.1l-4.12 2.86A.9.9 0 0 1 6.5 21.2Z" />
            </svg>
          </button>
          <div className={styles.toast} ref={toastRef} role="status" aria-live="polite">
            <span ref={toastTextRef}>저장했어요</span>
          </div>
        </div>
      </div>
    </main>
  );
}
