import type { CSSProperties, ReactNode } from "react";
import styles from "./AuroraBlurBg.module.scss";

export type AuroraBlurBgProps = {
  children?: ReactNode;
  /** 덩어리 하나가 경로를 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 덩어리 색 하나 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function AuroraBlurBg({
  children,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
  className = "",
}: AuroraBlurBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
  void easing; // linear 고정 — spin 키프레임은 등속이 자연스럽다
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <span className={`${styles.aurora} ${styles.a1}`} aria-hidden="true" />
      <span className={`${styles.aurora} ${styles.a2}`} aria-hidden="true" />
      <span className={`${styles.aurora} ${styles.a3}`} aria-hidden="true" />
      {children}
    </div>
  );
}
