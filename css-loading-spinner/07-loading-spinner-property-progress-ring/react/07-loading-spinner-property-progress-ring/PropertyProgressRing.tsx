import type { CSSProperties } from "react";
import styles from "./PropertyProgressRing.module.scss";

export type PropertyProgressRingProps = {
  /** 스피너 지름 (기본 80px) */
  size?: number;
  /** 0 → 100 → 0 한 사이클 시간 (기본 1800ms) */
  duration?: number;
  /** 채워지는 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--size"?: string; "--duration"?: string; "--color"?: string };

export default function PropertyProgressRing({
  size = 80,
  duration = 1800,
  color = "#fff7e6",
  label = "Progress",
}: PropertyProgressRingProps) {
  const vars: Vars = {
    "--size": `${size}px`,
    "--duration": `${duration}ms`,
    "--color": color,
  };
  return (
    <div
      className={styles.ring}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    />
  );
}
