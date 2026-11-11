import { useEffect, useState } from "react";
import styles from "./PercentCounter.module.scss";

export type PercentCounterProps = {
  /** 숫자 색 */
  color?: string;
};

// 실제 쓰임: 스크롤 진행률을 그대로 정수 퍼센트로 보여준다.
export default function PercentCounter({ color = "#17141a" }: PercentCounterProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={styles.counter} role="status" aria-label="Reading progress">
      <span className={styles.num} style={{ color }}>{percent}%</span>
    </div>
  );
}
