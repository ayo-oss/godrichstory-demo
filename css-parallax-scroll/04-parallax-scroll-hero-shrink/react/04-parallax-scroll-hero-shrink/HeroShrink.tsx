import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroShrink.module.scss";

export type HeroShrinkProps = {
  children: ReactNode;
  /** 다 스크롤했을 때 남는 크기 (기본 .55) */
  scaleTo?: number;
  /** 제목 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--scale-to"?: string; "--color"?: string };

export default function HeroShrink({
  children,
  scaleTo = 0.55,
  color = "#2f6df6",
  className = "",
}: HeroShrinkProps) {
  const vars: Vars = { "--scale-to": `${scaleTo}`, "--color": color };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <h2 className={styles.title}>{children}</h2>
    </div>
  );
}
