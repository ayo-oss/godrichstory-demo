import type { CSSProperties } from "react";
import styles from "./SegmentedSteps.module.scss";

export type SegmentedStepsProps = {
  /** 켜진 조각 수 (0~total) */
  active: number;
  total?: number;
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SegmentedSteps({
  active,
  total = 5,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
  label,
}: SegmentedStepsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div
      className={styles.segs}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={active}
      aria-label={label}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < active ? `${styles.seg} ${styles.on}` : styles.seg} />
      ))}
    </div>
  );
}
