import type { CSSProperties, ReactNode } from "react";
import styles from "./SpinIcon.module.scss";

export type SpinIconProps = {
  children: ReactNode;
  /** 한 바퀴 도는 데 걸리는 시간 (기본 1000ms) */
  duration?: number;
  /** CSS easing (기본 linear — 끊김 없이 일정한 속도) */
  easing?: string;
  /** 링 강조 색 */
  color?: string;
  onClick?: () => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SpinIcon({
  children,
  duration = 1000,
  easing = "linear",
  color = "#fff7e6",
  onClick,
}: SpinIconProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button type="button" className={styles.btn} style={vars} onClick={onClick}>
      <span className={styles.icon} aria-hidden="true" />
      {children}
    </button>
  );
}
