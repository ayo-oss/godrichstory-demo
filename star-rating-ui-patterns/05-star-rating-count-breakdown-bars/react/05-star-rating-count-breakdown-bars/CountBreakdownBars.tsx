import { useEffect, useRef } from "react";
import styles from "./CountBreakdownBars.module.scss";

const STARS = [5, 4, 3, 2, 1];

export default function CountBreakdownBars() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rows = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles.row}`)
    ) as HTMLElement[];
    let counts: Record<number, number> = { 5: 42, 4: 21, 3: 9, 2: 4, 1: 3 };
    let selected: number | null = null;

    // 계산 겹: 각 별점의 응답 개수를 전체 응답 개수 합으로 나눈 비율(%)을 막대 길이 값으로 쓴다.
    function total() {
      let t = 0;
      for (const k in counts) t += counts[Number(k)];
      return t;
    }

    function paint() {
      const t = total();
      rows.forEach((row, idx) => {
        const star = STARS[idx];
        const pct = t ? (counts[star] / t) * 100 : 0;
        row.querySelector<HTMLElement>(`.${styles.bar}`)!.style.width = pct.toFixed(1) + "%";
        row.querySelector<HTMLElement>(`.${styles.pct}`)!.textContent =
          Math.round(pct) + "% (" + counts[star] + ")";
        row.classList.toggle(styles.on, star === selected);
        row.setAttribute("aria-pressed", String(star === selected));
      });
    }

    const clickHandlers: Array<() => void> = [];
    rows.forEach((row, idx) => {
      const handler = () => {
        stopAutoplay();
        const star = STARS[idx];
        selected = selected === star ? null : star;
        paint();
      };
      clickHandlers.push(handler);
      row.addEventListener("click", handler);
    });

    paint();

    // 자동 루프: 별점 5→1 순서로 한 줄씩 선택 상태를 옮기고, 한 바퀴마다 응답 개수 하나를
    // 늘려 막대 길이 비율이 실시간으로 바뀌는 것을 보여준다.
    const order = [5, 4, 3, 2, 1];
    let oi = 0;
    const bump = [5, 3, 4, 5, 2, 5, 1, 4, 5, 3];
    let bi = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      selected = order[oi];
      oi = (oi + 1) % order.length;
      if (oi === 0) { const v = bump[bi % bump.length]; bi++; counts[v] = counts[v] + 1; }
      paint();
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 380); autoTick(); }

    return () => {
      stopAutoplay();
      rows.forEach((row, idx) => row.removeEventListener("click", clickHandlers[idx]));
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.list} role="list">
        {STARS.map((star) => (
          <button key={star} type="button" className={styles.row} role="listitem" aria-pressed="false">
            <span className={styles.label}>{star}</span>
            <span className={styles.track}><span className={styles.bar} /></span>
            <span className={styles.pct}>0%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
