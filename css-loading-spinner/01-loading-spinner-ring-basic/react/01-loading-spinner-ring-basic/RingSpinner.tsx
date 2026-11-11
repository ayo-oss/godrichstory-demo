import type { CSSProperties } from "react";
import styles from "./RingSpinner.module.scss";

export type RingSpinnerProps = {
  /** 스피너 지름 (기본 56px) */
  size?: number;
  /** 한 바퀴 도는 시간 (기본 1000ms) */
  duration?: number;
  /** 진한 구간 색 */
  color?: string;
  /** 접근성 라벨 */
  label?: string;
};

type Vars = CSSProperties & { "--size"?: string; "--duration"?: string; "--color"?: string };

export default function RingSpinner({
  size = 56,
  duration = 1000,
  color = "#2f6df6",
  label = "Loading",
}: RingSpinnerProps) {
  const vars: Vars = {
    "--size": `${size}px`,
    "--duration": `${duration}ms`,
    "--color": color,
  };
  return <div className={styles.spinner} style={vars} role="status" aria-label={label} />;
}
