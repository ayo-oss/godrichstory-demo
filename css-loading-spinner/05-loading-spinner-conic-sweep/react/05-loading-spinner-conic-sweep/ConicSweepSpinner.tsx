import type { CSSProperties } from "react";
import styles from "./ConicSweepSpinner.module.scss";

export type ConicSweepSpinnerProps = {
  /** 스피너 지름 (기본 68px) */
  size?: number;
  /** 한 바퀴 도는 시간 (기본 1100ms) */
  duration?: number;
  /** 그라디언트 진한 구간 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--size"?: string; "--duration"?: string; "--color"?: string };

export default function ConicSweepSpinner({
  size = 68,
  duration = 1100,
  color = "#2f6df6",
  label = "Loading",
}: ConicSweepSpinnerProps) {
  const vars: Vars = {
    "--size": `${size}px`,
    "--duration": `${duration}ms`,
    "--color": color,
  };
  return <div className={styles.spinner} style={vars} role="status" aria-label={label} />;
}
