import { useEffect, useRef } from "react";
import styles from "./NumberStepperCurrencyLiveFormat.module.scss";

export type NumberStepperCurrencyLiveFormatProps = {
  color?: string;
};

export default function NumberStepperCurrencyLiveFormat({
  color = "#0a4fe8",
}: NumberStepperCurrencyLiveFormatProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const btnPlus = root.querySelector<HTMLButtonElement>(`.${styles.btnPlus}`);
    const btnMinus = root.querySelector<HTMLButtonElement>(`.${styles.btnMinus}`);
    const cols = Array.from(root.querySelectorAll<HTMLSpanElement>(`.${styles.col}`));
    if (!btnPlus || !btnMinus || cols.length !== 4) return;

    const MIN = 0, MAX = 9999, STEP = 250;
    let value = 0;
    const H = 32;

    function toDigits(n: number) {
      const s = ("0000" + n).slice(-4);
      return [+s[0], +s[1], +s[2], +s[3]];
    }

    // 계산 겹: 자릿수(place)가 클수록 굴러가는 시작을 더 늦추고(delay) 더 오래 돈다(duration) —
    // 실제 기계식 계기판처럼 1의 자리가 먼저 넘어가고 그 여파가 왼쪽으로 번져 간다.
    const CASCADE = 60, BASE_DUR = 220;
    function startColumnRoll(colEl: HTMLSpanElement, newD: number, dir: number, place: number) {
      const oldEl = colEl.querySelector<HTMLSpanElement>(`.${styles.digitOld}`);
      const newEl = colEl.querySelector<HTMLSpanElement>(`.${styles.digitNew}`);
      if (!oldEl || !newEl) return;
      const delay = place * CASCADE;
      const duration = BASE_DUR + place * 40;
      newEl.textContent = String(newD);
      newEl.style.transform = "translateY(" + dir * H + "px)";
      setTimeout(() => {
        const start = performance.now();
        function frame(now: number) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          oldEl!.style.transform = "translateY(" + (dir * H * eased).toFixed(1) + "px)";
          newEl!.style.transform = "translateY(" + (dir * H * (eased - 1)).toFixed(1) + "px)";
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            oldEl!.textContent = String(newD);
            oldEl!.style.transform = "translateY(0)";
            newEl!.style.transform = "translateY(" + dir * H + "px)";
          }
        }
        requestAnimationFrame(frame);
      }, delay);
    }

    function commit(next: number) {
      next = Math.max(MIN, Math.min(MAX, next));
      if (next === value) { return; }
      const dir = next > value ? 1 : -1;
      const oldDigits = toDigits(value);
      const newDigits = toDigits(next);
      value = next;
      for (let i = 0; i < 4; i++) {
        if (oldDigits[i] !== newDigits[i]) {
          startColumnRoll(cols[i], newDigits[i], dir, 3 - i);
        }
      }
    }

    const onPlus = () => { root!.classList.remove(styles.isDemo); stopAutoplay(); commit(value + STEP); };
    const onMinus = () => { root!.classList.remove(styles.isDemo); stopAutoplay(); commit(value - STEP); };
    btnPlus.addEventListener("click", onPlus);
    btnMinus.addEventListener("click", onMinus);

    const seq = [250, 750, 1750, 4000, 9999, 0, 3333];
    let idx = 0;
    let autoplayTimer: ReturnType<typeof setInterval> | null = null;
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      autoplayTimer = setInterval(() => {
        commit(seq[idx % seq.length]);
        idx += 1;
      }, 1000);
    }

    return () => {
      stopAutoplay();
      btnPlus!.removeEventListener("click", onPlus);
      btnMinus!.removeEventListener("click", onMinus);
    };
  }, []);

  return (
    <div ref={rootRef} className={`${styles.stage} ${styles.isDemo}`} style={{ ["--color" as string]: color }}>
      <div className={styles.panel}>
        <span className={styles.label}>코인 잔액</span>
        <div className={styles.amount}>
          <span className={styles.symbol}>◆</span>
          <span className={styles.col}>
            <span className={`${styles.digit} ${styles.digitOld}`}>0</span>
            <span className={`${styles.digit} ${styles.digitNew}`}>0</span>
          </span>
          <span className={styles.comma}>,</span>
          <span className={styles.col}>
            <span className={`${styles.digit} ${styles.digitOld}`}>0</span>
            <span className={`${styles.digit} ${styles.digitNew}`}>0</span>
          </span>
          <span className={styles.col}>
            <span className={`${styles.digit} ${styles.digitOld}`}>0</span>
            <span className={`${styles.digit} ${styles.digitNew}`}>0</span>
          </span>
          <span className={styles.col}>
            <span className={`${styles.digit} ${styles.digitOld}`}>0</span>
            <span className={`${styles.digit} ${styles.digitNew}`}>0</span>
          </span>
        </div>
        <div className={styles.row}>
          <button className={`${styles.btn} ${styles.btnMinus}`} aria-label="250 감소" type="button">−</button>
          <button className={`${styles.btn} ${styles.btnPlus}`} aria-label="250 증가" type="button">+</button>
        </div>
      </div>
    </div>
  );
}
