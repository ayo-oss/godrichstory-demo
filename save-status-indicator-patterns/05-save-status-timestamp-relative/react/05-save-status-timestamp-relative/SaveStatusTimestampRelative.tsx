import { useEffect, useRef } from "react";
import styles from "./SaveStatusTimestampRelative.module.scss";

type Box<T> = { current: T };

export default function SaveStatusTimestampRelative() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dot = root.querySelector(`.${styles.dot}`) as HTMLElement | null;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!dot || !label || !btn) return;

    // 상수: 데모 안에서 "1초"를 표현하는 실제 ms(가속) · 분으로 넘어가는 기준 초 · 리셋되는 기준 초
    const DEMO_SEC_MS = 90;
    const MIN_THRESHOLD_SEC = 60;
    const RESET_AFTER_SEC = 150;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let savedAt = performance.now();
    let rafId = 0;

    // 계산 겹: 경과 초 = (지금 − 저장시각)÷가속ms, 초·분 환산으로 문구를 만들고 신선도(투명도)는 1 − min(1, 경과÷기준)
    function raf(ts: number) {
      let elapsedSec = Math.floor((ts - savedAt) / DEMO_SEC_MS);
      if (elapsedSec >= RESET_AFTER_SEC) { savedAt = ts; elapsedSec = 0; }
      let phrase: string;
      if (elapsedSec < 5) phrase = "방금 저장됨";
      else if (elapsedSec < MIN_THRESHOLD_SEC) phrase = elapsedSec + "초 전 저장됨";
      else phrase = Math.floor(elapsedSec / 60) + "분 전 저장됨";
      label!.textContent = phrase;
      const fresh = 1 - Math.min(1, elapsedSec / RESET_AFTER_SEC);
      dot!.style.opacity = reduce ? "1" : (0.35 + 0.65 * fresh).toFixed(3);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      savedAt = performance.now();
      label!.textContent = "방금 저장됨";
      dot!.style.opacity = "1";
    }
    btn.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.str} ${styles["is-demo"]}`}>
      <span className={styles.dot} />
      <span className={styles.label}>방금 저장됨</span>
      <button className={styles.btn} type="button">지금 저장</button>
    </div>
  );
}
