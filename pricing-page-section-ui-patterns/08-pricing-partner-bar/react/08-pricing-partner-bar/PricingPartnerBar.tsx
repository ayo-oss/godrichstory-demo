// PricingPartnerBar — vanilla 판(run/339/demo/08-pricing-partner-bar/index.html) 의 React 포트.
// 가상 화면 폭(viewport)이 바뀔 때마다 로고 한 칸의 실제 폭(itemWidth)과 간격(gap)을 재 몇 개가
// 들어가는지(fitCount) 다시 계산하고, 그만큼만 보이게 한다(계산 한 겹). 마퀴가 아니라 정적 배치라
// 무한 루프 트랙 복제는 쓰지 않는다.
import { useEffect, useRef } from "react";
import styles from "./PricingPartnerBar.module.scss";

export type PricingPartnerBarProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "가상 화면 폭이 바뀔 때마다 로고가 몇 개 들어가는지 다시 계산합니다";

const LOGOS = ["노트그린", "블룸웍스", "리본 스튜디오", "가온스퀘어", "다솔웍스", "별빛랩"];
const GAP = 8;
const WIDTHS = [220, 320, 420];

export default function PricingPartnerBar({
  duration = "300ms",
  easing = "ease-out",
  color = "#2f6df6"
}: PricingPartnerBarProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const chipRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const chip = chipRef.current;
    const items = itemRefs.current!;
    if (!viewport || !chip || items.some((el) => !el)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(width: number): void {
      viewport!.style.width = width + "px";
      const itemWidth = items[0]!.offsetWidth || 80;
      let fitCount = Math.max(1, Math.floor((width + GAP) / (itemWidth + GAP)));
      fitCount = Math.min(fitCount, items.length);
      items.forEach((item, i) => {
        if (item) item.style.display = i < fitCount ? "" : "none";
      });
      chip!.textContent = fitCount + "개 표시 중";
    }

    apply(WIDTHS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % WIDTHS.length;
        apply(WIDTHS[idx]);
      }, 900);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <div className={styles.viewport} ref={viewportRef}>
          <ul className={styles.row}>
            {LOGOS.map((name, i) => (
              <li
                key={name}
                className={styles.logo}
                ref={(el: HTMLLIElement | null) => {
                  itemRefs.current![i] = el;
                }}
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.chip} ref={chipRef}>
          0개 표시 중
        </p>
      </section>
    </main>
  );
}
