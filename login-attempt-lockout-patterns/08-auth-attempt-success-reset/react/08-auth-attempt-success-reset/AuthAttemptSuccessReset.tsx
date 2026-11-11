import { useEffect, useRef } from "react";
import styles from "./AuthAttemptSuccessReset.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptSuccessReset() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const failBtn = root.querySelector(`.${styles["btn--fail"]}`) as HTMLButtonElement | null;
    const okBtn = root.querySelector(`.${styles["btn--ok"]}`) as HTMLButtonElement | null;
    const countEl = root.querySelector(`.${styles.count}`) as HTMLElement | null;
    if (!failBtn || !okBtn || !countEl) return;

    // 상수: 최대 표시 실패 횟수 · 리셋 스프링 물리(강성·감쇠·질량)
    const MAX_SHOWN = 6;
    const SPRING_K = 220;
    const SPRING_C = 14;
    const SPRING_M = 1;

    let fails = 0;
    let scalePos = 1;
    let scaleVel = 0;
    let scaleTarget = 1;
    let rafId: number | null = null;

    function paintCount() {
      countEl!.textContent = String(fails);
      countEl!.classList.toggle(styles["count--ok"], fails === 0);
    }

    // 계산 겹: 리셋 순간 스케일 값을 스프링-감쇠 물리로 적분해 오버슈트 복귀를 만든다
    function scaleTick(ts: number, last: number) {
      const dt = Math.min(32, ts - last) / 1000;
      const disp = scalePos - scaleTarget;
      const acc = (-SPRING_K * disp - SPRING_C * scaleVel) / SPRING_M;
      scaleVel += acc * dt;
      scalePos += scaleVel * dt;
      countEl!.style.transform = "scale(" + scalePos.toFixed(3) + ")";
      if (Math.abs(disp) > 0.004 || Math.abs(scaleVel) > 0.01) {
        rafId = requestAnimationFrame((t) => scaleTick(t, ts));
      } else {
        scalePos = scaleTarget;
        countEl!.style.transform = "scale(1)";
      }
    }

    function bounce() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      scalePos = 1.5;
      scaleVel = 0;
      scaleTarget = 1;
      rafId = requestAnimationFrame((ts) => scaleTick(ts, ts - 16));
    }

    function fail() { fails = Math.min(MAX_SHOWN, fails + 1); paintCount(); }
    function success() { fails = 0; paintCount(); bounce(); }

    function onFailClick() { root!.classList.remove(styles["is-demo"]); stopAutoplay(); fail(); }
    function onOkClick() { root!.classList.remove(styles["is-demo"]); stopAutoplay(); success(); }
    failBtn.addEventListener("click", onFailClick);
    okBtn.addEventListener("click", onOkClick);
    paintCount();

    let autoTimer: number | null = null;
    let tick = 0;
    function autoTick() {
      tick += 1;
      if (tick % 4 === 0) success(); else fail();
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); }

    return () => {
      stopAutoplay();
      if (rafId !== null) cancelAnimationFrame(rafId);
      failBtn.removeEventListener("click", onFailClick);
      okBtn.removeEventListener("click", onOkClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.asr} ${styles["is-demo"]}`}>
      <div className={styles.readout}>
        <span className={styles.label}>실패 횟수</span>
        <span className={styles.count}>0</span>
      </div>
      <div className={styles.row}>
        <button className={`${styles.btn} ${styles["btn--fail"]}`} type="button">로그인 실패</button>
        <button className={`${styles.btn} ${styles["btn--ok"]}`} type="button">로그인 성공</button>
      </div>
    </div>
  );
}
