import type { CSSProperties } from "react";
import styles from "./DashCircleSpinner.module.scss";

export type DashCircleSpinnerProps = {
  /** svg 전체가 도는 시간 (기본 1400ms) */
  durationSpin?: number;
  /** 궤적이 늘었다 줄었다 하는 시간 (기본 1400ms) */
  durationDash?: number;
  /** 궤적 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--duration-spin"?: string; "--duration-dash"?: string; "--color"?: string };

export default function DashCircleSpinner({
  durationSpin = 1400,
  durationDash = 1400,
  color = "#17141a",
  label = "Loading",
}: DashCircleSpinnerProps) {
  const vars: Vars = {
    "--duration-spin": `${durationSpin}ms`,
    "--duration-dash": `${durationDash}ms`,
    "--color": color,
  };
  return (
    <svg
      className={styles.spinner}
      style={vars}
      viewBox="0 0 44 44"
      width="56"
      height="56"
      role="status"
      aria-label={label}
    >
      <circle className={styles.track} cx="22" cy="22" r="18" fill="none" strokeWidth="4" />
      <circle className={styles.arc} cx="22" cy="22" r="18" fill="none" strokeWidth="4" />
    </svg>
  );
}
