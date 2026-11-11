import type { CSSProperties, ReactNode } from "react";
import styles from "./ZoomOutScroll.module.scss";

export type ZoomOutScrollProps = {
  children: ReactNode;
  /** 처음 확대 배율 (기본 1.45) */
  scaleFrom?: number;
  /** 라벨 글자 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--scale-from"?: string; "--color"?: string };

export default function ZoomOutScroll({
  children,
  scaleFrom = 1.45,
  color = "#fff7e6",
  className = "",
}: ZoomOutScrollProps) {
  const vars: Vars = { "--scale-from": `${scaleFrom}`, "--color": color };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.media} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
    </div>
  );
}
