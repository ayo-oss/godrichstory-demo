import type { CSSProperties, ReactNode } from "react";
import styles from "./TextShadowPop.module.scss";

export type TextShadowPopProps = {
  label: ReactNode;
  /** 튀는 값 */
  value: ReactNode;
  /** 한 번 통통 튀는 시간 (기본 1000ms) */
  duration?: number;
  easing?: string;
  /** 글로우 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function TextShadowPop({
  label,
  value,
  duration = 1000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: TextShadowPopProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line}>
      {label} <span className={styles.hl} style={vars}>{value}</span>
    </p>
  );
}
