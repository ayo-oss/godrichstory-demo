import type { CSSProperties } from "react";
import styles from "./ConicRing.module.scss";

export type ConicRingProps = {
  /** 0~100 */
  percent: number;
  duration?: number;
  easing?: string;
  /** 낮음 구간(0~40) 색 */
  color?: string;
  /** 중간 구간(40~75) 색 */
  zoneMid?: string;
  /** 높음 구간(75~100) 색 */
  zoneHigh?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--percent"?: number;
  "--zone"?: string;
};

export default function ConicRing({
  percent,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
  zoneMid = "#ffd23f",
  zoneHigh = "#17141a",
  label,
}: ConicRingProps) {
  const p = Math.max(0, Math.min(100, percent));
  const zone = p < 40 ? color : p < 75 ? zoneMid : zoneHigh;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--percent": p, "--zone": zone };

  return (
    <div
      className={styles.ring}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label}
    />
  );
}
