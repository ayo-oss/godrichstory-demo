import type { CSSProperties } from "react";
import styles from "./CountdownTimer.module.scss";

export type CountdownTimerProps = {
  /** 몇에서 시작해 0으로 향할지 */
  from: number;
  label: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--t-start"?: number };

export default function CountdownTimer({
  from, label, duration = 2000, easing = "ease-out", color = "#fff7e6",
}: CountdownTimerProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--t-start": from,
  };

  return (
    <div className={styles.counter} style={vars}>
      <span className={styles.num} aria-hidden="true" />
      <span className={styles.sr}>0</span>
      <span className={styles.bar} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
