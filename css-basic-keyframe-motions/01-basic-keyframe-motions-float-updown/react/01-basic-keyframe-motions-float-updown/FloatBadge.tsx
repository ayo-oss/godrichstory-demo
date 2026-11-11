import type { CSSProperties, ReactNode } from "react";
import styles from "./FloatBadge.module.scss";

export type FloatBadgeProps = {
  children: ReactNode;
  /** 한 번 오가는 데 걸리는 시간 (기본 3000ms) */
  duration?: number;
  /** CSS easing (기본 ease-in-out) */
  easing?: string;
  /** 점 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function FloatBadge({
  children,
  duration = 3000,
  easing = "ease-in-out",
  color = "#2f6df6",
}: FloatBadgeProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.badge} style={vars}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </div>
  );
}
