import { useEffect, useRef } from "react";
import styles from "./ResultCountMorph.module.scss";

// 결과 수가 바뀔 때 이전 값과 새 값의 차이를 requestAnimationFrame 으로 나눠 화면 숫자를 그 사이 값으로 다시 그린다(textContent).
// 자동 시연만, 실사용 리스너 없음.
const VALUES = [128, 47, 283, 128];
const STEP_MS = 900;
const HOLD_MS = 350;

function ease(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function ResultCountMorph() {
  const countRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = countRef.current;
    if (!el) return;

    let alive = true;
    let idx = 0;
    let from = VALUES[0];
    let rafId = 0;
    let timeoutId = 0;

    function animate(to: number, duration: number) {
      let start: number | null = null;
      function frame(ts: number) {
        if (!alive) return;
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / duration);
        const value = Math.round(from + (to - from) * ease(t));
        el!.textContent = value + "개";
        el!.style.setProperty("--pulse", (1 - t).toFixed(3));
        if (t < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          from = to;
          timeoutId = window.setTimeout(step, HOLD_MS);
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    function step() {
      if (!alive) return;
      idx = (idx + 1) % VALUES.length;
      animate(VALUES[idx], STEP_MS);
    }

    timeoutId = window.setTimeout(step, HOLD_MS);

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div className={styles.card}>
        <p className={styles.card__label}>검색 결과</p>
        <p ref={countRef} className={styles.card__count} role="status" aria-live="polite">
          128개
        </p>
      </div>
    </main>
  );
}
