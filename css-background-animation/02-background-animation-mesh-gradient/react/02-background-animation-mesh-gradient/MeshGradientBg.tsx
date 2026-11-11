import type { CSSProperties, ReactNode } from "react";
import styles from "./MeshGradientBg.module.scss";

export type MeshGradientBgProps = {
  children?: ReactNode;
  /** 얼룩 하나가 경로를 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 얼룩 색 하나 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MeshGradientBg({
  children,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  className = "",
}: MeshGradientBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <span className={`${styles.blob} ${styles.b1}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.b2}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.b3}`} aria-hidden="true" />
      {children}
    </div>
  );
}
