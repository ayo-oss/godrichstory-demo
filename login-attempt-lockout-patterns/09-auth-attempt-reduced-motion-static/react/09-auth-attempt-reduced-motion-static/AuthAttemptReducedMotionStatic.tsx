import { useEffect, useRef } from "react";
import styles from "./AuthAttemptReducedMotionStatic.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptReducedMotionStatic() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const a = root.querySelector(`.${styles.a}`) as HTMLElement | null;
    const b = root.querySelector(`.${styles.b}`) as HTMLElement | null;
    if (!a || !b) return;

    // 상수: 최대 시도 횟수 · 일반 모션 흔들림 진폭·지속시간
    const MAX_TRIES = 5;
    const AMP = 6;
    const SHAKE_MS = 300;

    let remaining = MAX_TRIES;

    // 계산 겹: 일반 판은 감쇠 사인으로 흔들며 값을 바꾸고, 모션 감소 판은 같은 값을 애니메이션 없이 즉시 반영한다
    function shakeA() {
      let start: number | null = null;
      function frame(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / SHAKE_MS);
        const x = AMP * Math.sin(t * Math.PI * 2 * 3) * (1 - t);
        a!.style.transform = "translateX(" + x.toFixed(2) + "px)";
        if (t < 1) requestAnimationFrame(frame);
        else a!.style.transform = "translateX(0)";
      }
      requestAnimationFrame(frame);
    }

    function step() {
      remaining = remaining > 0 ? remaining - 1 : MAX_TRIES;
      a!.textContent = String(remaining);
      shakeA();
      // 모션 감소 판: 같은 값이 트윈 없이 그 자리에서 바로 바뀐다
      b!.textContent = String(remaining);
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      step();
    }
    root.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoTimer = window.setInterval(step, 420);
    } else {
      autoTimer = window.setInterval(() => {
        remaining = remaining > 0 ? remaining - 1 : MAX_TRIES;
        a!.textContent = b!.textContent = String(remaining);
      }, 420);
    }

    return () => {
      stopAutoplay();
      root!.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.arm} ${styles["is-demo"]}`}>
      <div className={styles.panel}>
        <span className={styles.tag}>일반 모션</span>
        <span className={`${styles.count} ${styles.a}`}>5</span>
      </div>
      <div className={styles.panel}>
        <span className={styles.tag}>모션 감소</span>
        <span className={`${styles.count} ${styles["count--static"]} ${styles.b}`}>5</span>
      </div>
    </div>
  );
}
