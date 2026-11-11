import type { CSSProperties, ReactNode } from "react";
import styles from "./HorizontalTimeline.module.scss";

export type HorizontalTimelineProps = {
  /** 카드 내용 (숫자·짧은 라벨) */
  items: ReactNode[];
  label?: string;
  /** 가로 이동 거리 (기본 120px) */
  travel?: number;
  /** 카드 사이 간격 (기본 14px) */
  gap?: number;
  className?: string;
};

type Vars = CSSProperties & { "--travel"?: string; "--gap"?: string };

export default function HorizontalTimeline({
  items,
  label = "Timeline",
  travel = 120,
  gap = 14,
  className = "",
}: HorizontalTimelineProps) {
  const vars: Vars = { "--travel": `${travel}px`, "--gap": `${gap}px` };

  return (
    <div className={`${styles.hline} ${className}`} style={vars}>
      <span className={styles.label}>{label}</span>
      <div className={styles.track}>
        {items.map((item, i) => (
          <span key={i} className={styles.card}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
