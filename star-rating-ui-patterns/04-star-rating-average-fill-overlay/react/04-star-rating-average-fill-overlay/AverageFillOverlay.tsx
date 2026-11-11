import { useEffect, useRef } from "react";
import styles from "./AverageFillOverlay.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";

export default function AverageFillOverlay() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const clips = Array.prototype.slice.call(
      root.querySelectorAll(`.${styles.fillclip}`)
    ) as HTMLElement[];
    const avgEl = root.querySelector<HTMLElement>(`.${styles.avg}`);
    const nEl = root.querySelector<HTMLElement>(`.${styles.n}`);
    const btn = root.querySelector<HTMLButtonElement>(`.${styles.btn}`);
    if (!avgEl || !nEl || !btn) return;

    // 계산 겹: 별점별 응답 개수(counts)로 가중 평균(합 / 개수)을 구하고, 정수 부분만큼 별을 채운 뒤
    // 남은 소수점 부분을 다음 별 하나의 채움 너비 값으로 겹쳐 그린다.
    let counts: Record<number, number> = { 5: 12, 4: 8, 3: 3, 2: 1, 1: 1 };
    const queue = [5, 3, 5, 4, 2, 5, 4, 3, 5, 1];
    let qi = 0;

    function average() {
      let sum = 0, n = 0;
      for (const k in counts) { sum += Number(k) * counts[Number(k)]; n += counts[Number(k)]; }
      return { avg: sum / n, n };
    }

    function paint() {
      const r = average();
      clips.forEach((el, idx) => {
        const starVal = Math.max(0, Math.min(1, r.avg - idx));
        el.style.width = (starVal * 100).toFixed(1) + "%";
      });
      avgEl!.textContent = r.avg.toFixed(2);
      nEl!.textContent = String(r.n);
    }

    function addReview() {
      const v = queue[qi % queue.length];
      qi++;
      counts[v] = (counts[v] || 0) + 1;
      paint();
    }

    function onClick() { stopAutoplay(); addReview(); }
    btn.addEventListener("click", onClick);

    paint();

    // 자동 루프: 대기열의 다음 평점을 하나씩 추가해 평균 값이 실시간으로 옮겨가는 것을 반복해 보여준다.
    let autoTimer: number | null = null;
    function autoTick() {
      addReview();
      if (qi % queue.length === 0) { counts = { 5: 12, 4: 8, 3: 3, 2: 1, 1: 1 }; }
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 480); }

    return () => {
      stopAutoplay();
      btn.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.row}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.star}>
              <svg className={styles.base} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              <span className={styles.fillclip}>
                <svg className={styles.fill} viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
              </span>
            </span>
          ))}
        </div>
        <div className={styles.readout}>
          <b className={styles.avg}>4.16</b> <span className={styles.count}>(<span className={styles.n}>25</span>건)</span>
        </div>
        <button className={styles.btn} type="button">리뷰 추가</button>
      </div>
    </div>
  );
}
