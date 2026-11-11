import type { CSSProperties, ReactNode } from "react";
import styles from "./DotPatternDriftBg.module.scss";

export type DotPatternDriftBgProps = {
  children?: ReactNode;
  /** 점 한 칸만큼 흐르는 시간 (기본 2000ms) */
  duration?: number;
  /** 점 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function DotPatternDriftBg({
  children,
  duration = 2000,
  color = "#fff7e6",
  className = "",
}: DotPatternDriftBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <div className={styles.dots} aria-hidden="true" />
      {children}
    </div>
  );
}
