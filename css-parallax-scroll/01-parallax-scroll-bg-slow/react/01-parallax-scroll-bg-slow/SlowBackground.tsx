import type { CSSProperties, ReactNode } from "react";
import styles from "./SlowBackground.module.scss";

export type SlowBackgroundProps = {
  children: ReactNode;
  /** 배경 이동량 (기본 24px, 스크롤의 0.4배 느낌) */
  shift?: number;
  /** 배경 점 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--shift"?: string; "--color"?: string };

export default function SlowBackground({
  children,
  shift = 24,
  color = "#fff7e6",
  className = "",
}: SlowBackgroundProps) {
  const vars: Vars = { "--shift": `${shift}px`, "--color": color };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.title}>{children}</div>
    </div>
  );
}
