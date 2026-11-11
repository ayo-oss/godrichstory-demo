import { useEffect, useRef } from "react";
import styles from "./DownloadManagerCompleteFlash.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerCompleteFlash() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sweep = root.querySelector(`.${styles.sweep}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!sweep || !btn) return;

    // 상수: 완료 표시 유지 시간(ms) · 광택 sweep 1회 길이(ms) · 반복 횟수 · 감쇠율
    const VISIBLE_MS = 1500;
    const SWEEP_MS = 420;
    const SWEEP_COUNT = 3;
    const DECAY = 0.55;
    const CYCLE_MS = 2400;

    let start = performance.now();
    let rafId = 0;
    let stopped = false;

    // 계산 겹: 광택 sweep 의 세기 = 초기값 × DECAY^회차(지수 감쇠) — 매 회차 옅어지다 사라진다
    function sweepOpacity(passIndex: number) {
      return Math.pow(DECAY, passIndex);
    }

    function frame(now: number) {
      if (stopped) return;
      const e = (now - start) % CYCLE_MS;
      const on = e < VISIBLE_MS;
      root!.classList.toggle(styles["dcf--on"], on);
      if (on) {
        const passLen = SWEEP_MS;
        const passIdx = Math.floor(e / passLen);
        const passT = (e % passLen) / passLen;
        if (passIdx < SWEEP_COUNT) {
          const x = -30 + passT * 160;
          sweep!.style.transform = "translateX(" + x.toFixed(1) + "%) skewX(-18deg)";
          sweep!.style.opacity = sweepOpacity(passIdx).toFixed(3);
        } else {
          sweep!.style.opacity = "0";
        }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      start = performance.now();
      root!.classList.add(styles["dcf--on"]);
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dcf} ${styles["is-demo"]}`}>
      <div className={styles.badge}>
        <span className={styles.sweep} />
        <span className={styles.text}>완료</span>
      </div>
      <button className={styles.btn} type="button">다시 보기</button>
    </div>
  );
}
