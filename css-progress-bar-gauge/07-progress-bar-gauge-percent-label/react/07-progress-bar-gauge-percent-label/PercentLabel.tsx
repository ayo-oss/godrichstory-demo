import type { CSSProperties } from "react";
import styles from "./PercentLabel.module.scss";

export type PercentLabelProps = {
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

export default function PercentLabel({
  percent,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
  label,
}: PercentLabelProps) {
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
      <div className={styles.bubble}>{Math.round(p)}%</div>
    </div>
  );
}
