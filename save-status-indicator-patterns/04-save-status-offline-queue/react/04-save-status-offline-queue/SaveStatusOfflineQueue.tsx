import { useEffect, useRef } from "react";
import styles from "./SaveStatusOfflineQueue.module.scss";

type Box<T> = { current: T };

export default function SaveStatusOfflineQueue() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const label = root.querySelector(`.${styles.label}`) as HTMLElement | null;
    const countEl = root.querySelector(`.${styles.count}`) as HTMLElement | null;
    const fill = root.querySelector(`.${styles.fill}`) as HTMLElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!label || !countEl || !fill || !btn) return;

    // 상수: 대기 칸 최대 값 · 쌓이는 간격(가속 ms) · 줄어드는 간격(가속 ms)
    const MAX_QUEUE = 6;
    const ADD_MS = 260;
    const DRAIN_MS = 150;

    let online = false;
    let count = 0;
    let timer = 0;
    let stopped = false;

    // 계산 겹: 막대 채움 값 = 대기 건수 ÷ 최대 건수 — scaleX 산술
    function paint() {
      countEl!.textContent = count + "건 대기";
      fill!.style.transform = "scaleX(" + (count / MAX_QUEUE).toFixed(3) + ")";
      label!.textContent = online ? "온라인" : "오프라인";
      root!.classList.toggle(styles["soq--online"], online);
    }

    function tick() {
      if (stopped) return;
      if (!online) {
        count = Math.min(MAX_QUEUE, count + 1);
        paint();
        if (count >= MAX_QUEUE) { online = true; paint(); timer = window.setTimeout(tick, DRAIN_MS); return; }
        timer = window.setTimeout(tick, ADD_MS);
      } else {
        count = Math.max(0, count - 1);
        paint();
        if (count <= 0) {
          timer = window.setTimeout(() => { online = false; paint(); timer = window.setTimeout(tick, ADD_MS); }, 500);
          return;
        }
        timer = window.setTimeout(tick, DRAIN_MS);
      }
    }
    timer = window.setTimeout(tick, ADD_MS);
    paint();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      online = !online;
      paint();
      timer = window.setTimeout(tick, online ? DRAIN_MS : ADD_MS);
    }
    btn.addEventListener("click", onClick);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.soq} ${styles["is-demo"]}`}>
      <div className={styles.row}>
        <span className={styles.label}>오프라인</span>
        <span className={styles.count}>0건 대기</span>
      </div>
      <div className={styles.track}><div className={styles.fill} /></div>
      <button className={styles.btn} type="button">연결 전환</button>
    </div>
  );
}
