import { useEffect, useRef } from "react";
import styles from "./SaveStatusDotCycle.module.scss";

type Box<T> = { current: T };

export default function SaveStatusDotCycle() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const dotEls = Array.from(root.querySelectorAll(`.${styles.dot}`)) as HTMLElement[];
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (dotEls.length < 3 || !label || !btn) return;

    // 상수: 단계 수(대기·진행·완료) · 단계가 넘어가는 간격(가속 ms)
    const STAGE_COUNT = 3;
    const STEP_MS = 480;
    const NAMES = ["대기", "진행", "완료"];
    const CLASSES = [styles["dot--idle"], styles["dot--busy"], styles["dot--done"]];

    let stageIndex = 0;
    let timer = 0;

    // 계산 겹: i번째 점의 표시 단계 = (현재 단계 − i + 단계수) mod 단계수 — 값이 점마다 어긋나며 뒤따라간다
    function paint() {
      label!.textContent = NAMES[stageIndex];
      dotEls.forEach((d, i) => {
        const s = ((stageIndex - i) % STAGE_COUNT + STAGE_COUNT) % STAGE_COUNT;
        d.className = styles.dot + " " + CLASSES[s];
      });
    }
    paint();

    function step() {
      stageIndex = (stageIndex + 1) % STAGE_COUNT;
      paint();
      timer = window.setTimeout(step, STEP_MS);
    }
    timer = window.setTimeout(step, STEP_MS);

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      stageIndex = (stageIndex + 1) % STAGE_COUNT;
      paint();
      timer = window.setTimeout(step, STEP_MS);
    }
    btn.addEventListener("click", onClick);

    return () => {
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.sdc} ${styles["is-demo"]}`}>
      <div className={styles.dots}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.label}>대기</span>
      <button className={styles.btn} type="button">다음 단계</button>
    </div>
  );
}
