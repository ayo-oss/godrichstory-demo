import type { CSSProperties } from "react";
import styles from "./BatteryGauge.module.scss";

export type BatteryGaugeProps = {
  /** 0~100 */
  percent: number;
  duration?: number;
  easing?: string;
  colorFull?: string;
  colorMid?: string;
  colorLow?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--percent"?: number;
  "--fill"?: string;
};

export default function BatteryGauge({
  percent,
  duration = 600,
  easing = "linear",
  colorFull = "#fff7e6",
  colorMid = "#ffd23f",
  colorLow = "#c2361a",
  label,
}: BatteryGaugeProps) {
  const p = Math.max(0, Math.min(100, percent));
  const fill = p > 55 ? colorFull : p > 20 ? colorMid : colorLow;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--percent": p, "--fill": fill };

  return (
    <div
      className={p <= 15 ? `${styles.battery} ${styles.low}` : styles.battery}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label}
    >
      <div className={styles.cell}>
        <div className={styles.fill} />
      </div>
      <div className={styles.nub} />
    </div>
  );
}
