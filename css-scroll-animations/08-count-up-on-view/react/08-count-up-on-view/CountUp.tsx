import type { CSSProperties } from "react";
import styles from "./CountUp.module.scss";

export type CountUpProps = {
  label: string;
  /** 목표 숫자 (기본 1280) */
  target?: number;
  /** 올라가는 시간 (기본 1.2s) */
  duration?: string;
  /** 숫자 색 (기본 파랑) */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--target"?: number; "--duration"?: string; "--color"?: string };

export default function CountUp({
  label,
  target = 1280,
  duration = "1.2s",
  color = "#2f6df6",
  className = "",
}: CountUpProps) {
  const vars: Vars = { "--target": target, "--duration": duration, "--color": color };

  return (
    <div className={`${styles.stat} ${className}`} style={vars}>
      <p className={styles.num} />
      <p className={styles.label}>{label}</p>
    </div>
  );
}
