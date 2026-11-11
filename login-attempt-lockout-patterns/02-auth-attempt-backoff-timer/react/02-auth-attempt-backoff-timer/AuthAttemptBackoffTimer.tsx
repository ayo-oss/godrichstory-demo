import { useEffect, useRef } from "react";
import styles from "./AuthAttemptBackoffTimer.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptBackoffTimer() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const failsEl = root.querySelector(`.${styles.fails}`) as HTMLElement | null;
    const waitEl = root.querySelector(`.${styles.wait}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    if (!btn || !failsEl || !waitEl || !fill) return;

    // 상수: 지수 백오프 = BACKOFF_BASE_SEC × 2^실패횟수(초), CAP_SEC 에서 증가를 멈춘다
    const BACKOFF_BASE_SEC = 1;
    const CAP_SEC = 16;
    const DEMO_TICK_MS = 90;

    let fails = 0;
    let locked = false;
    let rafId: number | null = null;

    function waitSecondsOf(n: number) {
      return Math.min(CAP_SEC, BACKOFF_BASE_SEC * Math.pow(2, n));
    }

    function countdown(totalSec: number) {
      locked = true;
      btn!.disabled = true;
      let start: number | null = null;
      const totalMs = totalSec * DEMO_TICK_MS;
      function frame(ts: number) {
        if (start === null) start = ts;
        const elapsed = ts - start;
        const left = Math.max(0, totalSec - elapsed / DEMO_TICK_MS);
        waitEl!.textContent = "다음 시도까지 " + Math.ceil(left) + "초";
        fill!.style.transform = "scaleX(" + Math.max(0, left / totalSec) + ")";
        if (elapsed < totalMs) { rafId = requestAnimationFrame(frame); }
        else {
          waitEl!.textContent = "대기 없음";
          fill!.style.transform = "scaleX(0)";
          locked = false;
          btn!.disabled = false;
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    function fail() {
      if (locked) return;
      fails += 1;
      failsEl!.textContent = String(fails);
      countdown(waitSecondsOf(fails));
    }

    function reset() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      fails = 0;
      locked = false;
      btn!.disabled = false;
      failsEl!.textContent = "0";
      waitEl!.textContent = "대기 없음";
      fill!.style.transform = "scaleX(0)";
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      fail();
    }
    btn.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    let stage = 0;
    function autoTick() {
      if (locked) return;
      if (stage >= 4) { reset(); stage = 0; return; }
      fail();
      stage += 1;
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 260); }

    return () => {
      stopAutoplay();
      if (rafId !== null) cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.abt} ${styles["is-demo"]}`}>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.label}>실패 <b className={styles.fails}>0</b>회</span>
          <span className={styles.wait}>대기 없음</span>
        </div>
        <div className={styles.track}><div className={styles.fill} /></div>
        <button className={styles.btn} type="button">로그인 시도</button>
      </div>
    </div>
  );
}
