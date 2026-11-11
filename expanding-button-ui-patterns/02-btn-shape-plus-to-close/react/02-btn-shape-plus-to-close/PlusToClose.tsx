import { useEffect, useRef } from "react";
import styles from "./PlusToClose.module.scss";

type Box<T> = { current: T };

const SPIN_DEG = 135; // 계산 겹: 회전 목표 각도 값 — 90도가 아니라 지나쳤다가 되돌아오는 각도
const OVER_MS = 90;   // 계산 겹: 목표 각도를 넘겼다 되돌리는 여분 시간

export default function PlusToClose() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    if (!btn) return;

    let closed = false;
    function paint() {
      root!.classList.toggle(styles["root--closed"], closed);
      btn!.setAttribute("aria-pressed", String(closed));
    }
    function toggle() {
      closed = !closed;
      paint();
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      toggle();
    }
    btn.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(toggle, 1100); }
    else { closed = true; paint(); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.pc} ${styles["is-demo"]}`}>
      <button type="button" className={styles.btn} aria-pressed="false">
        <span className={styles.label}>항목 값 추가</span>
        <span className={styles.disc} aria-hidden="true">
          <svg className={styles.icon} viewBox="0 0 24 24" width="22" height="22">
            <line className={styles.v} x1="12" y1="5" x2="12" y2="19" />
            <line className={styles.h} x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>
    </div>
  );
}
