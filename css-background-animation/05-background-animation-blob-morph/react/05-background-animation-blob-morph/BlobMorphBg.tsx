import type { CSSProperties, ReactNode } from "react";
import styles from "./BlobMorphBg.module.scss";

export type BlobMorphBgProps = {
  children?: ReactNode;
  /** 세 블롭이 한 바퀴 교차하는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 블롭 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BlobMorphBg({
  children,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  className = "",
}: BlobMorphBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <span className={`${styles.blob} ${styles.m1}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.m2}`} aria-hidden="true" />
      <span className={`${styles.blob} ${styles.m3}`} aria-hidden="true" />
      {children}
    </div>
  );
}
