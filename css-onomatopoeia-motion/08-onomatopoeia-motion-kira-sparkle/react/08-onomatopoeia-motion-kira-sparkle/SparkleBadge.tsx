import type { CSSProperties, ReactNode } from "react";
import styles from "./SparkleBadge.module.scss";

export type SparkleBadgeProps = {
  children: ReactNode;
  /** 한 번 반짝이는 주기 (기본 1800ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SparkleBadge({
  children,
  duration = 1800,
  easing = "ease-in-out",
  color = "#2f6df6",
}: SparkleBadgeProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.badge} style={vars}>
      {children}
    </div>
  );
}
