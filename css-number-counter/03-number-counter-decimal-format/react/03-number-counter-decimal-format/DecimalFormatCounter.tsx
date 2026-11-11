import type { CSSProperties } from "react";
import styles from "./DecimalFormatCounter.module.scss";

export type DecimalFormatCounterProps = {
  /** 4.98 처럼 소수 둘째 자리까지 */
  value: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--whole-target"?: number; "--frac-target"?: number;
};

export default function DecimalFormatCounter({
  value, label, duration = 2000, easing = "ease-out", color = "#fff7e6",
}: DecimalFormatCounterProps) {
  const whole = Math.floor(value);
  const frac = Math.round((value - whole) * 100);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--whole-target": whole,
    "--frac-target": frac,
  };

  return (
    <div className={styles.counter} style={vars}>
      <span className={styles.num} aria-hidden="true" />
      <span className={styles.sr}>{value.toFixed(2)}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
