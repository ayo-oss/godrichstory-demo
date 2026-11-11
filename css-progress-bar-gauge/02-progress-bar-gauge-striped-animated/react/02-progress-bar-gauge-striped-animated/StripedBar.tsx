import type { CSSProperties } from "react";
import styles from "./StripedBar.module.scss";

export type StripedBarProps = {
  /** 0~100 */
  percent: number;
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--percent"?: number;
};

export default function StripedBar({
  percent,
  duration = 1000,
  easing = "linear",
  color = "#17141a",
  label,
}: StripedBarProps) {
  const p = Math.max(0, Math.min(100, percent));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--percent": p };

  return (
    <div
      className={styles.track}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label}
    >
      <div className={styles.bar} />
    </div>
  );
}
