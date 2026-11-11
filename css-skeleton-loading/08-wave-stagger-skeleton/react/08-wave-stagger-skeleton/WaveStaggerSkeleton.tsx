import type { CSSProperties } from "react";
import styles from "./WaveStaggerSkeleton.module.scss";

export type WaveStaggerSkeletonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  /** 줄 수 (기본 6) */
  rows?: number;
  /** 줄 사이 시차 (기본 60ms) */
  stagger?: number;
  className?: string;
};

const WIDTHS = ["92%", "68%", "84%", "55%", "78%", "45%"];

export default function WaveStaggerSkeleton({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  rows = 6,
  stagger = 60,
  className = "",
}: WaveStaggerSkeletonProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={`${styles.rows} ${className}`} style={vars}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{
            width: WIDTHS[i % WIDTHS.length],
            animationDelay: `${-i * stagger}ms`,
            animationDirection: i % 2 ? "reverse" : "normal",
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
