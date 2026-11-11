import type { CSSProperties } from "react";
import styles from "./DualRingSpinner.module.scss";

export type DualRingSpinnerProps = {
  /** 스피너 지름 (기본 68px) */
  size?: number;
  /** 바깥 링 한 바퀴 시간 (기본 1200ms) */
  durationOuter?: number;
  /** 안쪽 링 한 바퀴 시간, 역방향 (기본 900ms) */
  durationInner?: number;
  /** 바깥 링 색 */
  color?: string;
  /** 안쪽 링 색 */
  accent?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--size"?: string;
  "--duration-outer"?: string;
  "--duration-inner"?: string;
  "--color"?: string;
  "--accent"?: string;
};

export default function DualRingSpinner({
  size = 68,
  durationOuter = 1200,
  durationInner = 900,
  color = "#17141a",
  accent = "#2f6df6",
  label = "Loading",
}: DualRingSpinnerProps) {
  const vars: Vars = {
    "--size": `${size}px`,
    "--duration-outer": `${durationOuter}ms`,
    "--duration-inner": `${durationInner}ms`,
    "--color": color,
    "--accent": accent,
  };
  return (
    <div className={styles.spinner} style={vars} role="status" aria-label={label}>
      <span className={styles.outer} aria-hidden="true" />
      <span className={styles.inner} aria-hidden="true" />
    </div>
  );
}
