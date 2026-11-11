import type { CSSProperties } from "react";
import styles from "./CardSkeleton.module.scss";

export type CardSkeletonProps = {
  /** 빛이 카드 한 장을 훑는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 ease-out) */
  easing?: string;
  /** 막대 색 */
  color?: string;
  className?: string;
};

export default function CardSkeleton({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
  className = "",
}: CardSkeletonProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={`${styles.card} ${className}`} style={vars}>
      <div className={styles.thumb} />
      <div className={styles.title} />
      <div className={styles.desc} />
      <div className={`${styles.desc} ${styles.short}`} />
    </div>
  );
}
