import { useEffect, useState } from "react";
import styles from "./ReadingTime.module.scss";

export type ReadingTimeProps = {
  /** 전체 예상 분 */
  totalMinutes: number;
  /** 숫자 색 */
  color?: string;
};

// 실제 쓰임: 남은 분 = 전체 분 × (1 − 스크롤 진행률).
export default function ReadingTime({ totalMinutes, color = "#fff7e6" }: ReadingTimeProps) {
  const [left, setLeft] = useState(totalMinutes);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setLeft(Math.max(0, Math.round(totalMinutes * (1 - p))));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [totalMinutes]);

  return (
    <p className={styles.time} role="status">
      <span>left</span>
      <span className={styles.num} style={{ color }}>{left}</span>
      <span>min</span>
    </p>
  );
}
