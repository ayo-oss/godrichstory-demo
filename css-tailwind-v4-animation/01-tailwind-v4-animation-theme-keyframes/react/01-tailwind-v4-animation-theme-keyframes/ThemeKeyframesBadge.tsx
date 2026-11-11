import type { CSSProperties } from "react";
import styles from "./ThemeKeyframesBadge.module.scss";

export type ThemeKeyframesBadgeProps = {
  label?: string;
  /** @theme --animate-pop-spin 의 지속 시간, ms */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ThemeKeyframesBadge({
  label = "NEW",
  duration = 900,
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#fff7e6",
}: ThemeKeyframesBadgeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <span className={styles.badge} style={vars}>
      {label}
    </span>
  );
}
