import { useEffect, useState } from "react";
import styles from "./ChapterSteps.module.scss";

export type ChapterStepsProps = {
  /** 챕터 수 */
  total: number;
  /** 채워진 원 색 */
  color?: string;
};

// 실제 쓰임: 전체 스크롤 진행률을 챕터 수로 나눠 지금 챕터를 계산한다.
export default function ChapterSteps({ total, color = "#fff7e6" }: ChapterStepsProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setCurrent(Math.min(total - 1, Math.floor(p * total)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [total]);

  return (
    <ol className={styles.steps} aria-label="Chapter progress">
      {Array.from({ length: total }, (_, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.circle} style={i <= current ? { background: color, borderColor: color } : undefined}>
            {i + 1}
          </span>
        </li>
      ))}
    </ol>
  );
}
