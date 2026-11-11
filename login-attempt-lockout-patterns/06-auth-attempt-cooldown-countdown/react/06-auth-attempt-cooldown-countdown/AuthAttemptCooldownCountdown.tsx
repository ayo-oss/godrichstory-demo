import { useEffect, useRef } from "react";
import styles from "./AuthAttemptCooldownCountdown.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptCooldownCountdown() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const numEl = root.querySelector(`.${styles.num}`) as HTMLElement | null;
    const msgEl = root.querySelector(`.${styles.msg}`) as HTMLElement | null;
    if (!btn || !numEl || !msgEl) return;

    // 상수: 잠금 유지 초 · 데모 안 "1초"를 표현하는 실제 ms(가속) · 초마다 펄스 스케일 크기
    const LOCK_SECONDS = 8;
    const DEMO_TICK_MS = 170;
    const PULSE_SCALE = 1.22;

    let remaining = LOCK_SECONDS;
    let timerId: number | null = null;

    function easeOutBack(t: number) { return 1 + 1.4 * Math.pow(t - 1, 3) + 0.6 * Math.pow(t - 1, 2); }

    // 계산 겹: 초가 바뀔 때 easing 곡선(easeOutBack)으로 스케일 값을 만들어 펄스
    function pulse() {
      let start: number | null = null;
      const dur = 160;
      function frame(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / dur);
        const s = 1 + (PULSE_SCALE - 1) * (1 - easeOutBack(t));
        numEl!.style.transform = "scale(" + s.toFixed(3) + ")";
        if (t < 1) requestAnimationFrame(frame);
        else numEl!.style.transform = "scale(1)";
      }
      requestAnimationFrame(frame);
    }

    function paint() {
      numEl!.textContent = String(remaining);
      root!.classList.toggle(styles.open, remaining <= 0);
      msgEl!.textContent = remaining <= 0 ? "지금 다시 시도할 수 있습니다" : "잠금 해제까지 남은 초";
      btn!.disabled = remaining > 0;
    }

    function start() {
      remaining = LOCK_SECONDS;
      paint();
      if (timerId !== null) window.clearInterval(timerId);
      timerId = window.setInterval(() => {
        remaining -= 1;
        pulse();
        if (remaining <= 0 && timerId !== null) { window.clearInterval(timerId); timerId = null; }
        paint();
      }, DEMO_TICK_MS);
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      if (remaining <= 0) start();
    }
    btn.addEventListener("click", onClick);
    paint();

    let autoTimer: number | null = null;
    function stopAutoplay() { if (autoTimer !== null) { window.clearTimeout(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      start();
      autoTimer = window.setInterval(() => { if (remaining <= 0) start(); }, DEMO_TICK_MS);
    }

    return () => {
      stopAutoplay();
      if (timerId !== null) window.clearInterval(timerId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.acc} ${styles["is-demo"]}`}>
      <div className={styles.num}>8</div>
      <div className={styles.msg}>잠금 해제까지 남은 초</div>
      <button className={styles.btn} type="button">다시 시도</button>
    </div>
  );
}
