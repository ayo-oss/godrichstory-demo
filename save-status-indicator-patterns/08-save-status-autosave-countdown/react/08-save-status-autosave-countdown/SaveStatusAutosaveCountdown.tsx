import { useEffect, useRef } from "react";
import styles from "./SaveStatusAutosaveCountdown.module.scss";

type Box<T> = { current: T };

export default function SaveStatusAutosaveCountdown() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const numEl = root.querySelector(`.${styles.num}`) as HTMLElement | null;
    const prog = root.querySelector(`.${styles.prog}`) as SVGCircleElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!numEl || !prog || !btn) return;

    // 상수: 다음 저장까지 초 · 링 반지름(SVG 좌표) · 데모 안 "1초"의 실제 ms(가속)
    const CYCLE_SEC = 10;
    const R = 40;
    const DEMO_TICK_MS = 130;
    const CIRC = 2 * Math.PI * R;
    prog.style.strokeDasharray = CIRC.toFixed(2);

    let remaining = CYCLE_SEC;
    let timerId = 0;

    // 계산 겹: 링 오프셋 = 둘레 × (1 − 남은초/전체초) — stroke-dashoffset 산술
    function paint() {
      numEl!.textContent = String(remaining);
      const offset = CIRC * (1 - remaining / CYCLE_SEC);
      prog!.style.strokeDashoffset = offset.toFixed(2);
      root!.classList.toggle(styles["sac--saving"], remaining <= 0);
    }

    function start() {
      remaining = CYCLE_SEC;
      root!.classList.remove(styles["sac--saving"]);
      paint();
      window.clearInterval(timerId);
      timerId = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          paint();
          window.clearInterval(timerId);
          timerId = window.setTimeout(start, 500);
          return;
        }
        paint();
      }, DEMO_TICK_MS);
    }
    start();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearInterval(timerId);
      window.clearTimeout(timerId);
      remaining = 0;
      paint();
      timerId = window.setTimeout(start, 500);
    }
    btn.addEventListener("click", onClick);

    return () => {
      window.clearInterval(timerId);
      window.clearTimeout(timerId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.sac} ${styles["is-demo"]}`}>
      <div className={styles.ringwrap}>
        <svg className={styles.ring} viewBox="0 0 100 100" width="120" height="120">
          <circle className={styles.track} cx="50" cy="50" r="40" />
          <circle className={styles.prog} cx="50" cy="50" r="40" />
        </svg>
        <div className={styles.mid}>
          <span className={styles.num}>10</span>
          <span className={styles.unit}>초 후 저장</span>
        </div>
      </div>
      <button className={styles.btn} type="button">지금 저장</button>
    </div>
  );
}
