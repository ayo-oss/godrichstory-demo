import type { CSSProperties } from "react";
import styles from "./ThousandsSeparatorCounter.module.scss";

export type ThousandsSeparatorCounterProps = {
  /** 12483 처럼 콤마 없는 정수 */
  value: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--k-target"?: number; "--n-target"?: number;
};

export default function ThousandsSeparatorCounter({
  value, label, duration = 2000, easing = "ease-out", color = "#17141a",
}: ThousandsSeparatorCounterProps) {
  const k = Math.floor(value / 1000);
  const n = value % 1000;
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--k-target": k,
    "--n-target": n,
  };

  return (
    <div className={styles.counter} style={vars}>
      <span className={styles.num} aria-hidden="true" />
      <span className={styles.sr}>{value.toLocaleString()}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
