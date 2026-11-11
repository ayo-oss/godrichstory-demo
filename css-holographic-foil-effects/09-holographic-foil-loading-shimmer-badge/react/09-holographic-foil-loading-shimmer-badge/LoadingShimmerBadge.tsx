import type { CSSProperties } from "react";
import styles from "./LoadingShimmerBadge.module.scss";

export type LoadingShimmerBadgeProps = {
  label: string;
  /** 시머 띠가 한 번 훑는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 점 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LoadingShimmerBadge({
  label,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: LoadingShimmerBadgeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.badge} style={vars}>
      <span className={styles.shine} aria-hidden="true" />
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
