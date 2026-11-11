import type { CSSProperties, ReactNode } from "react";
import styles from "./GradientShiftBg.module.scss";

export type GradientShiftBgProps = {
  children?: ReactNode;
  /** 한 바퀴 흐르는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 흐르는 그라데이션의 포인트 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GradientShiftBg({
  children,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  className = "",
}: GradientShiftBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <div className={styles.bg} aria-hidden="true" />
      {children}
    </div>
  );
}
