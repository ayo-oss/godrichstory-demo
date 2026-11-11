import { useEffect, useRef } from "react";
import styles from "./DownloadManagerReducedMotion.module.scss";

type Box<T> = { current: T };

export default function DownloadManagerReducedMotion() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fillA = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const pctA = root.querySelector(`.${styles.pctA}`) as HTMLElement | null;
    const pctB = root.querySelector(`.${styles.pctB}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!fillA || !pctA || !pctB || !btn) return;

    // 상수: 진행 속도(%/틱) · 틱 간격(ms)
    const STEP = 4;
    const TICK_MS = 130;
    let forcedReduce = false;
    let pct = 0;
    let timer = 0;
    let stopped = false;

    // 계산 겹: 같은 진행 값 하나를 두 판이 다르게 그린다 — 왼쪽은 매 틱 transform 갱신, 오른쪽은 문구만 교체(레이아웃·트랜지션 0)
    function paint() {
      fillA!.style.transform = "scaleX(" + (pct / 100).toFixed(3) + ")";
      pctA!.textContent = pct + "%";
      pctB!.textContent = pct + "%";
    }

    function tick() {
      if (stopped) return;
      pct = (pct + STEP) % 101;
      paint();
      timer = window.setTimeout(tick, TICK_MS);
    }
    tick();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      forcedReduce = !forcedReduce;
      root!.classList.toggle(styles["drm--force-reduce"], forcedReduce);
      btn!.textContent = forcedReduce ? "일반 모션 전환" : "모션 감소 전환";
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.drm} ${styles["is-demo"]}`}>
      <div className={styles.col}>
        <span className={styles.colLabel}>일반 모션</span>
        <div className={styles.track}><div className={styles.fill} /></div>
        <span className={`${styles.pct} ${styles.pctA}`}>0%</span>
      </div>
      <div className={`${styles.col} ${styles["col--reduced"]}`}>
        <span className={styles.colLabel}>모션 감소</span>
        <div className={styles.staticBox}><span className={`${styles.pct} ${styles.pctB}`}>0%</span></div>
      </div>
      <button className={styles.btn} type="button">모션 감소 전환</button>
    </div>
  );
}
