// PricingDiscountBadge — vanilla 판(run/339/demo/04-pricing-discount-badge/index.html) 의 React 포트.
// 정가와 할인가의 차이를 정가로 나눠 퍼센트를 한 번 구해 배지에 채우고, 가상 마감까지 남은 시간은
// rAF 로 매 프레임 다시 계산해 표시하며, 남은 비율이 낮아지면 배지 색을 바꾼다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingDiscountBadge.module.scss";

export type PricingDiscountBadgeProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "정가와 할인가 차이로 퍼센트를 구하고 마감까지 남은 시간을 따로 계산합니다";

const LIST = 49;
const SALE = 32;
const LOOP_MS = 2000;
const TOTAL_SEC = 12 * 60;
const URGENT_RATIO = 0.25;

function format(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" + s : String(s));
}

export default function PricingDiscountBadge({
  duration = "220ms",
  easing = "ease-out",
  color = "#2f6df6"
}: PricingDiscountBadgeProps) {
  const pctBadgeRef = useRef<HTMLParagraphElement | null>(null);
  const countdownRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const pctBadge = pctBadgeRef.current;
    const countdown = countdownRef.current;
    if (!pctBadge || !countdown) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pct = Math.round(((LIST - SALE) / LIST) * 100);
    pctBadge.textContent = pct + "% 할인";

    function frame(elapsed: number): void {
      const progress = Math.min(elapsed / LOOP_MS, 1);
      const remainSec = TOTAL_SEC * (1 - progress);
      countdown!.textContent = format(remainSec) + " 남아";
      const urgent = remainSec / TOTAL_SEC < URGENT_RATIO;
      pctBadge!.classList.toggle(styles.isUrgent, urgent);
      countdown!.classList.toggle(styles.isUrgent, urgent);
    }

    let raf = 0;
    if (reduce) {
      frame(0);
    } else {
      let start: number | null = null;
      const tick = (ts: number): void => {
        if (start === null) start = ts;
        const elapsed = (ts - start) % LOOP_MS;
        frame(elapsed);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.priceRow}>
          <span className={styles.priceOld}>49</span>
          <span className={styles.priceNew}>32</span>
        </div>
        <p className={styles.badge} ref={pctBadgeRef}>
          0% 할인
        </p>
        <p className={styles.countdown} aria-live="polite" ref={countdownRef}>
          0:00 남음
        </p>
      </section>
    </main>
  );
}
