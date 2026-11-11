import { useEffect, useRef } from "react";
import styles from "./SaveStatusErrorRetry.module.scss";

type Box<T> = { current: T };

export default function SaveStatusErrorRetry() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const card = root.querySelector(`.${styles.card}`) as HTMLElement | null;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const countEl = root.querySelector(`.${styles.count}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!card || !label || !countEl || !btn) return;

    // 상수: 최대 재시도 횟수 · 흔들림 진폭 · 흔들림 지속시간 · 재시도 사이 대기 배증 기준(가속 ms)
    const MAX_RETRY = 3;
    const AMP = 5;
    const SHAKE_MS = 260;
    const BACKOFF_BASE_MS = 260;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let retries = MAX_RETRY;
    let timer = 0;
    let rafId = 0;
    let stopped = false;

    // 계산 겹: 흔들림 = 감쇠 사인(sin(t·2π·3)×(1−t)), 대기 = BACKOFF_BASE_MS×2^(실패 순번)
    function shake(cb: () => void) {
      if (reduce) { cb(); return; }
      let start: number | null = null;
      function frame(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / SHAKE_MS);
        const x = AMP * Math.sin(t * Math.PI * 2 * 3) * (1 - t);
        card!.style.transform = "translateX(" + x.toFixed(2) + "px)";
        if (t < 1) rafId = requestAnimationFrame(frame); else { card!.style.transform = "translateX(0)"; cb(); }
      }
      rafId = requestAnimationFrame(frame);
    }

    function fail() {
      if (stopped) return;
      retries -= 1;
      label!.textContent = "저장 실패";
      root!.classList.add(styles["ser--fail"]);
      shake(() => {
        if (retries > 0) {
          countEl!.textContent = "남은 재시도 " + retries;
          const wait = BACKOFF_BASE_MS * Math.pow(2, MAX_RETRY - retries - 1);
          timer = window.setTimeout(fail, wait);
        } else {
          countEl!.textContent = "재시도 소진";
          root!.classList.add(styles["ser--out"]);
          timer = window.setTimeout(reset, 900);
        }
      });
    }

    function reset() {
      retries = MAX_RETRY;
      label!.textContent = "저장 실패";
      countEl!.textContent = "남은 재시도 " + retries;
      root!.classList.remove(styles["ser--out"]);
      root!.classList.remove(styles["ser--fail"]);
      timer = window.setTimeout(fail, BACKOFF_BASE_MS);
    }
    timer = window.setTimeout(fail, BACKOFF_BASE_MS);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      reset();
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.ser} ${styles["is-demo"]}`}>
      <div className={styles.card}>
        <span className={styles.label}>저장 실패</span>
        <span className={styles.count}>남은 재시도 3</span>
      </div>
      <button className={styles.btn} type="button">다시 저장</button>
    </div>
  );
}
