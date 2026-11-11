import type { CSSProperties, ReactNode } from "react";
import styles from "./ColorSweepBadge.module.scss";

export type ColorSweepBadgeProps = {
  children: ReactNode;
  /** 빛 한 줄이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  /** 배지 바탕색 */
  bg?: string;
  /** 빛 줄기 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--bg"?: string;
  "--color"?: string;
};

export default function ColorSweepBadge({
  children,
  duration = 2000,
  bg = "#ff4d1f",
  color = "#fff7e6",
}: ColorSweepBadgeProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--bg": bg,
    "--color": color,
  };
  return (
    <span className={styles.badge} style={vars}>
      {children}
    </span>
  );
}
