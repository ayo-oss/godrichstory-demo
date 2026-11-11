import type { CSSProperties, ReactNode } from "react";
import styles from "./StripesDiagonalBg.module.scss";

export type StripesDiagonalBgProps = {
  children?: ReactNode;
  /** 줄무늬 한 칸만큼 행진하는 시간 (기본 2000ms) */
  duration?: number;
  /** 줄무늬 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function StripesDiagonalBg({
  children,
  duration = 2000,
  color = "#2f6df6",
  className = "",
}: StripesDiagonalBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <div className={styles.stripes} aria-hidden="true" />
      {children}
    </div>
  );
}
