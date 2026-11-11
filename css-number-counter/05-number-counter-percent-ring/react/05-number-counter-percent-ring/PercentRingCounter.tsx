import type { CSSProperties } from "react";
import styles from "./PercentRingCounter.module.scss";

export type PercentRingCounterProps = {
  /** 0~100 */
  percent: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--p-target"?: number };

export default function PercentRingCounter({
  percent, label, duration = 2000, easing = "ease-out", color = "#fff7e6",
}: PercentRingCounterProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--p-target": percent,
  };

  return (
    <div className={styles.stat}>
      <div className={styles.ring} style={vars}>
        <span className={styles.num} aria-hidden="true" />
        <span className={styles.sr}>{percent}%</span>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
