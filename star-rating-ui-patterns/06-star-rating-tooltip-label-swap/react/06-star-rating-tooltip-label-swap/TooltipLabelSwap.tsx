import { useEffect, useRef } from "react";
import styles from "./TooltipLabelSwap.module.scss";

const STAR_PATH =
  "M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279-6.064-5.828 8.332-1.151z";
const LABELS: Record<number, string> = { 1: "매우 별로", 2: "별로", 3: "보통", 4: "좋음", 5: "최고" };

export default function TooltipLabelSwap() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const row = root.querySelector<HTMLDivElement>(`.${styles.row}`);
    const tip = root.querySelector<HTMLDivElement>(`.${styles.tip}`);
    if (!row || !tip) return;
    const stars = Array.prototype.slice.call(
      row.querySelectorAll(`.${styles.star}`)
    ) as HTMLElement[];
    let pendingTimer: number | null = null;

    // 계산 겹: 별의 실제 렌더 위치(getBoundingClientRect 중심 x)를 말풍선의 translateX 값으로
    // 그대로 옮기고, 인덱스 변경은 짧은 지연(debounce)을 거친 뒤에만 이름표 문구를 바꾼다 —
    // 빠르게 스쳐 지나갈 때 문구가 매 별마다 깜빡이지 않게 하는 타이밍 계산이다.
    function positionTip(i: number) {
      const star = stars[i - 1];
      const sr = star.getBoundingClientRect();
      const rr = row!.getBoundingClientRect();
      const cx = sr.left + sr.width / 2 - rr.left;
      tip!.style.transform = "translateX(" + cx.toFixed(1) + "px) translateX(-50%)";
    }

    function commit(i: number) {
      tip!.textContent = LABELS[i];
      positionTip(i);
      tip!.classList.add(styles.show);
      stars.forEach((s, idx) => s.classList.toggle(styles.filled, idx < i));
    }

    function requestSwap(i: number) {
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      pendingTimer = window.setTimeout(() => commit(i), 40);
    }

    function hide() {
      if (pendingTimer !== null) { window.clearTimeout(pendingTimer); pendingTimer = null; }
      tip!.classList.remove(styles.show);
      stars.forEach((s) => s.classList.remove(styles.filled));
    }

    const enterHandlers: Array<() => void> = [];
    stars.forEach((s, idx) => {
      const i = idx + 1;
      const handler = () => { stopAutoplay(); requestSwap(i); };
      enterHandlers.push(handler);
      s.addEventListener("pointerenter", handler);
    });
    row.addEventListener("pointerleave", hide);

    // 자동 루프: 1부터 5까지 순서대로 머무르며 이름표 문구가 바뀌는 것을 보여주고 끝에서 감춘다.
    let step = 0;
    let autoTimer: number | null = null;
    function autoTick() {
      if (step < 5) { commit(step + 1); } else { hide(); }
      step = (step + 1) % 7;
    }
    function stopAutoplay() { if (autoTimer !== null) { window.clearInterval(autoTimer); autoTimer = null; } }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) { autoTimer = window.setInterval(autoTick, 340); autoTick(); }

    return () => {
      stopAutoplay();
      if (pendingTimer !== null) window.clearTimeout(pendingTimer);
      stars.forEach((s, idx) => s.removeEventListener("pointerenter", enterHandlers[idx]));
      row.removeEventListener("pointerleave", hide);
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.stage}>
      <div className={styles.sr}>
        <div className={styles.tip}>보통</div>
        <div className={styles.row}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={styles.star}>
              <svg viewBox="0 0 24 24"><path d={STAR_PATH} /></svg>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
