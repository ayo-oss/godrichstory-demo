import { useEffect, useRef } from "react";
import styles from "./AuthAttemptAlertBannerSlide.module.scss";

type Box<T> = { current: T };

export default function AuthAttemptAlertBannerSlide() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLButtonElement | null;
    const failsEl = root.querySelector(`.${styles.fails}`) as HTMLElement | null;
    const banner = root.querySelector(`.${styles.banner}`) as HTMLElement | null;
    if (!btn || !failsEl || !banner) return;

    // 상수: 배너가 뜨는 실패 기준 · 스프링 물리(강성·감쇠·질량)
    const THRESHOLD = 3;
    const SPRING_K = 180;
    const SPRING_C = 18;
    const SPRING_M = 1;

    let fails = 0;
    let pos = -60;
    let vel = 0;
    let target = -60;
    let rafId: number | null = null;

    // 계산 겹: 반암시적 오일러 스프링 적분 — 속도 += (-k·변위 − c·속도)/질량·dt, 위치 += 속도·dt
    function tick(ts: number, last: number) {
      const dt = Math.min(32, ts - last) / 1000;
      const disp = pos - target;
      const acc = (-SPRING_K * disp - SPRING_C * vel) / SPRING_M;
      vel += acc * dt;
      pos += vel * dt;
      banner!.style.transform = "translateY(" + pos.toFixed(2) + "%)";
      if (Math.abs(disp) > 0.3 || Math.abs(vel) > 0.5) {
        rafId = requestAnimationFrame((t) => tick(t, ts));
      } else {
        pos = target;
        banner!.style.transform = "translateY(" + pos.toFixed(2) + "%)";
      }
    }

    function spring(to: number) {
      if (rafId !== null) cancelAnimationFrame(rafId);
      target = to;
      rafId = requestAnimationFrame((ts) => tick(ts, ts - 16));
    }

    function fail() {
      fails += 1;
      failsEl!.textContent = String(fails);
      if (fails === THRESHOLD) spring(0);
    }

    function reset() {
      fails = 0;
      failsEl!.textContent = "0";
      spring(-60);
    }

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      stopAutoplay();
      fail();
    }
    btn.addEventListener("click", onClick);

    let autoTimer: number | null = null;
    function autoTick() {
      if (fails >= THRESHOLD) { reset(); return; }
      fail();
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 420); }

    return () => {
      stopAutoplay();
      if (rafId !== null) cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.abs} ${styles["is-demo"]}`}>
      <div className={styles.banner}>이상 로그인 시도가 반복되었습니다</div>
      <div className={styles.card}>
        <span className={styles.label}>반복 실패 <b className={styles.fails}>0</b>회</span>
        <button className={styles.btn} type="button">로그인 실패 시도</button>
      </div>
    </div>
  );
}
