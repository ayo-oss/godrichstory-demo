import type { CSSProperties, ReactNode } from "react";
import styles from "./StickyParallax.module.scss";

export type StickyParallaxProps = {
  children: ReactNode;
  /** 뒤 배경 이동량 (기본 40px) */
  bgShift?: number;
  /** 배경 결·문장 글자 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--bg-shift"?: string; "--color"?: string };

export default function StickyParallax({
  children,
  bgShift = 40,
  color = "#fff7e6",
  className = "",
}: StickyParallaxProps) {
  const vars: Vars = { "--bg-shift": `${bgShift}px`, "--color": color };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.bg} aria-hidden="true" />
      <p className={styles.caption}>{children}</p>
    </div>
  );
}
