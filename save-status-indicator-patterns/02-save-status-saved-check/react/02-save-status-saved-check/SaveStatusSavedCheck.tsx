import { useEffect, useRef } from "react";
import styles from "./SaveStatusSavedCheck.module.scss";

type Box<T> = { current: T };

export default function SaveStatusSavedCheck() {
  const rootRef = useRef(null) as unknown as Box<HTMLDivElement | null>;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const badge = root.querySelector(`.${styles.badge}`) as HTMLElement | null;
    const check = root.querySelector(`.${styles.check}`) as SVGPolylineElement | null;
    const btn = root.querySelector(`.${styles.btn}`) as HTMLElement | null;
    if (!badge || !check || !btn) return;

    // 상수: 체크 선이 그려지는 시간 · 다 그려진 뒤 머무는 시간 · 사라지는 시간 · 다음 저장까지 간격
    const DRAW_MS = 300;
    const HOLD_MS = 380;
    const FADE_MS = 200;
    const GAP_MS = 260;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 계산 겹: getTotalLength() 로 실제 경로 길이를 재고, stroke-dashoffset = 길이×(1−t) 로 그려 나간다
    const len = check.getTotalLength();
    check.style.strokeDasharray = String(len);
    check.style.strokeDashoffset = String(len);

    let timer = 0;
    let rafId = 0;
    let stopped = false;

    function draw(cb: () => void) {
      if (reduce) { check!.style.strokeDashoffset = "0"; cb(); return; }
      let start: number | null = null;
      function frame(ts: number) {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / DRAW_MS);
        check!.style.strokeDashoffset = (len * (1 - t)).toFixed(2);
        if (t < 1) rafId = requestAnimationFrame(frame); else cb();
      }
      rafId = requestAnimationFrame(frame);
    }

    function cycle() {
      if (stopped) return;
      badge!.classList.add(styles["badge--show"]);
      draw(() => {
        timer = window.setTimeout(() => {
          badge!.classList.remove(styles["badge--show"]);
          timer = window.setTimeout(() => {
            check!.style.strokeDashoffset = String(len);
            timer = window.setTimeout(cycle, GAP_MS);
          }, reduce ? 0 : FADE_MS);
        }, HOLD_MS);
      });
    }
    cycle();

    function onClick() {
      root!.classList.remove(styles["is-demo"]);
      window.clearTimeout(timer);
      check!.style.strokeDashoffset = String(len);
      badge!.classList.remove(styles["badge--show"]);
      rafId = requestAnimationFrame(cycle);
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
    <div ref={rootRef} className={`${styles.stage} ${styles.ssc} ${styles["is-demo"]}`}>
      <div className={styles.badge}>
        <svg className={styles.ring} viewBox="0 0 40 40" width="40" height="40">
          <circle className={styles.circle} cx="20" cy="20" r="17" />
          <polyline className={styles.check} points="12,21 17,26 28,13" />
        </svg>
      </div>
      <span className={styles.label}>저장 완료</span>
      <button className={styles.btn} type="button">변경 저장</button>
    </div>
  );
}
