import { useEffect, useRef } from "react";
import styles from "./AuthAttemptCounterShake.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptCounterShake() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const countEl = root.querySelector(`.${styles.count}`) as HTMLElement | null;
    if (!btn || !countEl) return;

    // 상수: 최대 시도 횟수·흔들림 진폭 기준값·진폭 증가폭·흔들림 지속시간·진동 횟수
    const MAX_TRIES = 5;
    const AMP_BASE = 3;
    const AMP_STEP = 2;
    const SHAKE_MS = 480;
    const SHAKE_FREQ = 4;

    let remaining = MAX_TRIES;
    let shaking = false;

    function paint() {
      countEl!.textContent = String(remaining);
      countEl!.classList.toggle(styles["count--low"], remaining <= 1);
    }

    // 계산 겹: 진폭 = 기준값 + (최대-남은)×증가폭, 감쇠 사인 = sin(t·2π·진동수)×(1-t)
    function shake() {
      const amp = AMP_BASE + (MAX_TRIES - remaining) * AMP_STEP;
      let start: number | null = null;
      shaking = true;
      function frame(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / SHAKE_MS);
        const x = amp * Math.sin(t * Math.PI * 2 * SHAKE_FREQ) * (1 - t);
        countEl!.style.transform = "translateX(" + x.toFixed(2) + "px)";
        if (t < 1) requestAnimationFrame(frame);
        else { countEl!.style.transform = "translateX(0)"; shaking = false; }
      }
      requestAnimationFrame(frame);
    }

    function fail() {
      if (shaking) return;
      remaining = remaining > 0 ? remaining - 1 : MAX_TRIES;
      paint();
      shake();
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
    if (!reduce) { autoTimer = window.setInterval(fail, 420); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.acs} ${styles["is-demo"]}`}>
      <div className={styles.card}>
        <div className={styles.row}>
          <label className={styles.field}>
            <input className={styles.input} type="text" placeholder="아이디" autoComplete="off" spellCheck={false} />
          </label>
          <label className={styles.field}>
            <input className={`${styles.input} ${styles["input--pw"]}`} type="text" placeholder="비밀번호" autoComplete="off" spellCheck={false} />
          </label>
        </div>
        <button className={styles.btn} type="button">로그인</button>
        <div className={styles.readout}>
          <span className={styles.label}>남은 시도</span>
          <span className={styles.count}>5</span>
        </div>
      </div>
    </div>
  );
}
