import type { CSSProperties, ReactNode } from "react";
import styles from "./GridLinesDriftBg.module.scss";

export type GridLinesDriftBgProps = {
  children?: ReactNode;
  /** 격자 한 칸만큼 흐르는 시간 (기본 2000ms) */
  duration?: number;
  /** 격자선 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function GridLinesDriftBg({
  children,
  duration = 2000,
  color = "#2f6df6",
  className = "",
}: GridLinesDriftBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <div className={styles.grid} aria-hidden="true" />
      {children}
    </div>
  );
}
