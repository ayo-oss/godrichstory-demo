import { useEffect, useRef } from "react";
import styles from "./AuthAttemptLockoutRing.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptLockoutRing() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const countEl = root.querySelector(`.${styles.count}`) as HTMLElement | null;
    const prog = root.querySelector(`.${styles.prog}`) as SVGCircleElement | null;
    if (!btn || !countEl || !prog) return;

    // 상수: 최대 시도 횟수·링 반지름(SVG viewBox 좌표)
    const MAX_TRIES = 5;
    const R = 40;
    const CIRC = 2 * Math.PI * R;
    prog.style.strokeDasharray = CIRC.toFixed(2);

    let remaining = MAX_TRIES;

    // 계산 겹: 링 오프셋 = 둘레 × (1 − 남은/최대) — stroke-dashoffset 산술
    function paint() {
      countEl!.textContent = String(remaining);
      const offset = CIRC * (1 - remaining / MAX_TRIES);
      prog!.style.strokeDashoffset = offset.toFixed(2);
      root!.classList.toggle(styles.locked, remaining <= 0);
    }

    function fail() {
      if (remaining <= 0) { remaining = MAX_TRIES; paint(); return; }
      remaining -= 1;
      paint();
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      fail();
    }
    btn.addEventListener("click", onClick);
    paint();

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(fail, 380); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.alr} ${styles["is-demo"]}`}>
      <div className={styles.ringwrap}>
        <svg className={styles.ring} viewBox="0 0 100 100" width={120} height={120}>
          <circle className={styles.track} cx={50} cy={50} r={40} />
          <circle className={styles.prog} cx={50} cy={50} r={40} />
        </svg>
        <div className={styles.mid}>
          <span className={styles.count}>5</span>
          <span className={styles.label}>남은 시도</span>
        </div>
      </div>
      <button className={styles.btn} type="button">로그인 시도</button>
    </div>
  );
}
