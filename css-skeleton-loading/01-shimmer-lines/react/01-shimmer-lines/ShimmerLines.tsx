import type { CSSProperties } from "react";
import styles from "./ShimmerLines.module.scss";

export type ShimmerLinesProps = {
  /** 빛이 줄 하나를 훑는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 ease-out) */
  easing?: string;
  /** 막대·빛의 바탕 색 */
  color?: string;
  /** 줄 수 (기본 4) */
  lines?: number;
  className?: string;
};

const WIDTHS = ["92%", "100%", "78%", "55%"];

export default function ShimmerLines({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
  lines = 4,
  className = "",
}: ShimmerLinesProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={`${styles.lines} ${className}`} style={vars}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={styles.line}
          style={{ width: WIDTHS[i % WIDTHS.length], animationDelay: `${-i * 140}ms` } as CSSProperties}
        />
      ))}
    </div>
  );
}
