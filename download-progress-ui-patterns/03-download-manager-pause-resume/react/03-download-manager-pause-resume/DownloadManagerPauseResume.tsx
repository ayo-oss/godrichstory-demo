import { useEffect, useRef } from "react";
import styles from "./DownloadManagerPauseResume.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerPauseResume() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const state = root.querySelector(`.${styles.state}`) as HTMLElement | null;
    const pctEl = root.querySelector(`.${styles.pct}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!state || !pctEl || !fill || !btn) return;

    // 상수: 전체 소요 시간(ms) · 자동 루프의 정지 구간(ms)
    const TOTAL_MS = 2600;
    const AUTO_PAUSE_AT = [0.28, 0.62];
    const AUTO_PAUSE_MS = 420;

    let paused = false;
    let startedAt = performance.now();
    let pausedElapsed = 0;
    let raf = 0;
    let autoIdx = 0;
    let stopped = false;

    // 계산 겹: 경과 시간 = 정지 전 누적값(pausedElapsed) + (지금 - 재개 시각). 재개할 때 0으로 안 끊긴다
    function elapsed() {
      if (paused) return pausedElapsed;
      return pausedElapsed + (performance.now() - startedAt);
    }

    function paint() {
      const e = Math.min(TOTAL_MS, elapsed());
      const p = e / TOTAL_MS;
      fill!.style.transform = "scaleX(" + p.toFixed(4) + ")";
      pctEl!.textContent = Math.round(p * 100) + "%";
      state!.textContent = paused ? "정지" : p >= 1 ? "완료" : "진행";
      root!.classList.toggle(styles["dpr--paused"], paused && p < 1);
      return p;
    }

    function setPaused(v: boolean) {
      if (v === paused) return;
      if (v) {
        pausedElapsed = elapsed();
        paused = true;
      } else {
        startedAt = performance.now();
        paused = false;
      }
    }

    function tick() {
      if (stopped) return;
      const p = paint();
      if (!paused && p < 1 && autoIdx < AUTO_PAUSE_AT.length && p >= AUTO_PAUSE_AT[autoIdx]) {
        setPaused(true);
        autoIdx++;
        window.setTimeout(() => { if (root!.classList.contains(styles["is-demo"])) setPaused(false); }, AUTO_PAUSE_MS);
      }
      if (p >= 1) {
        window.setTimeout(() => {
          pausedElapsed = 0; startedAt = performance.now(); paused = false; autoIdx = 0; paint();
        }, 700);
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      setPaused(!paused);
      btn!.textContent = paused ? "재개" : "일시정지";
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dpr} ${styles["is-demo"]}`}>
      <div className={styles.head}>
        <span className={styles.state}>진행</span>
        <span className={styles.pct}>0%</span>
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <button className={styles.btn} type="button">일시정지</button>
    </div>
  );
}
