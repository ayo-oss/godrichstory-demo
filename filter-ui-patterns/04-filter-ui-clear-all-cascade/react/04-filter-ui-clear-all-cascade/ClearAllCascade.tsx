import { useEffect, useRef } from "react";
import styles from "./ClearAllCascade.module.scss";

// 칩의 순서(index) 값에 고정 간격(ms)을 곱해 사라지는 시작 시점을 다시 구한다.
// 실제 클릭: 칩마다 그 시점에 classList.remove 로 is-active 를 떼면 opacity 전환이 순서대로 일어난다.
// 데모 루프는 같은 계산을 CSS animation-delay 로 옮겨 무한 반복한다.
const STAGGER_MS = 90;

export default function ClearAllCascade() {
  const chipsRef = useRef<HTMLDivElement>(null);
  const clearBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const chips = chipsRef.current;
    const clearBtn = clearBtnRef.current;
    if (!chips || !clearBtn) return;

    const timers: number[] = [];

    function onClick() {
      chips!.classList.remove(styles["is-demo"]);
      const items = chips!.querySelectorAll<HTMLElement>("." + styles.chip);
      items.forEach((chip, i) => {
        const t = window.setTimeout(() => {
          chip.classList.remove(styles["is-active"]);
        }, i * STAGGER_MS);
        timers.push(t);
      });
    }

    clearBtn.addEventListener("click", onClick);
    return () => {
      clearBtn.removeEventListener("click", onClick);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <main className={styles.stage}>
      <div ref={chipsRef} className={`${styles.chips} ${styles["is-demo"]}`}>
        <span className={`${styles.chip} ${styles["is-active"]}`} style={{ "--i": 0 }}>
          여성
        </span>
        <span className={`${styles.chip} ${styles["is-active"]}`} style={{ "--i": 1 }}>
          블루
        </span>
        <span className={`${styles.chip} ${styles["is-active"]}`} style={{ "--i": 2 }}>
          M 사이즈
        </span>
        <span className={`${styles.chip} ${styles["is-active"]}`} style={{ "--i": 3 }}>
          세일
        </span>
      </div>
      <button ref={clearBtnRef} className={styles["clear-btn"]} type="button">
        전체 해제
      </button>
    </main>
  );
}
