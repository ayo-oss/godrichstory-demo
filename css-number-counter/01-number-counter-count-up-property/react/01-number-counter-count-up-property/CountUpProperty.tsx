import type { CSSProperties } from "react";
import styles from "./CountUpProperty.module.scss";

export type CountUpPropertyProps = {
  value: number;
  label: string;
  /** 0에서 목표값까지 세는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--num-target"?: number };

export default function CountUpProperty({ value, label, duration = 2000, easing = "ease-out", color = "#fff7e6" }: CountUpPropertyProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num-target": value,
  };

  return (
    <div className={styles.counter} style={vars}>
      <span className={styles.num} aria-hidden="true" />
      <span className={styles.sr}>{value.toLocaleString()}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
