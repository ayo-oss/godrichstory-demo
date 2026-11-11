import { useEffect, useRef } from "react";
import styles from "./DownloadManagerMultiFileList.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerMultiFileList() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fills = [0, 1, 2].map((i) => root.querySelector(`.${styles["fill" + i]}`) as HTMLElement | null);
    const pcts = [0, 1, 2].map((i) => root.querySelector(`.${styles["pct" + i]}`) as HTMLElement | null);
    const fillT = root.querySelector(`.${styles.fillT}`) as HTMLElement | null;
    const pctT = root.querySelector(`.${styles.pctT}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!fillT || !pctT || !btn) return;

    // 시드 고정: 파일별 크기(KB, 가상)와 틱마다 더할 속도 배열(KB/틱). 실 fetch·File API 0
    const SIZES = [420, 980, 640];
    const SPEEDS = [
      [32, 40, 48, 52, 46, 38, 30, 44, 56, 60, 50, 36],
      [58, 64, 60, 52, 44, 38, 46, 54, 62, 58, 48, 40],
      [20, 26, 32, 38, 44, 40, 34, 28, 24, 30, 36, 42],
    ];
    const TICK_MS = 140;
    const HOLD_MS = 700;

    let done = [0, 0, 0];
    let tick = 0;
    let paused = false;
    let timer = 0;
    let stopped = false;

    // 계산 겹: 전체 진행 값 = 파일별 다운로드 바이트 합 ÷ 전체 크기 합(용량 가중 평균, 단순 3칸 평균 아님)
    function overall() {
      const d = done[0] + done[1] + done[2];
      const s = SIZES[0] + SIZES[1] + SIZES[2];
      return d / s;
    }

    function paint() {
      for (let i = 0; i < 3; i++) {
        const p = done[i] / SIZES[i];
        const fillEl = fills[i];
        const pctEl = pcts[i];
        if (fillEl) fillEl.style.transform = "scaleX(" + p.toFixed(3) + ")";
        if (pctEl) pctEl.textContent = Math.round(p * 100) + "%";
      }
      const o = overall();
      fillT!.style.transform = "scaleX(" + o.toFixed(3) + ")";
      pctT!.textContent = Math.round(o * 100) + "%";
      root!.classList.toggle(styles["dmf--done"], o >= 1);
    }

    function step() {
      if (stopped) return;
      let allDone = true;
      for (let i = 0; i < 3; i++) {
        if (done[i] < SIZES[i]) {
          done[i] = Math.min(SIZES[i], done[i] + SPEEDS[i][tick % SPEEDS[i].length]);
          allDone = false;
        }
      }
      tick++;
      paint();
      if (allDone) {
        timer = window.setTimeout(() => { done = [0, 0, 0]; tick = 0; paint(); loop(); }, HOLD_MS);
      } else {
        loop();
      }
    }

    function loop() {
      if (paused || stopped) return;
      timer = window.setTimeout(step, TICK_MS);
    }

    paint();
    loop();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      paused = !paused;
      btn!.textContent = paused ? "재개" : "일시정지";
      if (!paused) loop();
      else window.clearTimeout(timer);
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.dmf} ${styles["is-demo"]}`}>
      <div className={styles.row}>
        <div className={styles.head}><span className={styles.name}>파일 1</span><span className={`${styles.pct} ${styles.pct0}`}>0%</span></div>
        <div className={styles.track}><div className={`${styles.fill} ${styles.fill0}`} /></div>
      </div>
      <div className={styles.row}>
        <div className={styles.head}><span className={styles.name}>파일 2</span><span className={`${styles.pct} ${styles.pct1}`}>0%</span></div>
        <div className={styles.track}><div className={`${styles.fill} ${styles.fill1}`} /></div>
      </div>
      <div className={styles.row}>
        <div className={styles.head}><span className={styles.name}>파일 3</span><span className={`${styles.pct} ${styles.pct2}`}>0%</span></div>
        <div className={styles.track}><div className={`${styles.fill} ${styles.fill2}`} /></div>
      </div>
      <div className={`${styles.row} ${styles["row--total"]}`}>
        <div className={styles.head}><span className={styles.name}>전체</span><span className={`${styles.pct} ${styles.pctT}`}>0%</span></div>
        <div className={styles.track}><div className={`${styles.fill} ${styles["fill--total"]} ${styles.fillT}`} /></div>
      </div>
      <button className={styles.btn} type="button">일시정지</button>
    </div>
  );
}
