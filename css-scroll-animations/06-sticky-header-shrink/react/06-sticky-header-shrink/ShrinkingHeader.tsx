import type { CSSProperties, ReactNode } from "react";
import styles from "./ShrinkingHeader.module.scss";

export type ShrinkingHeaderProps = {
  logo: string;
  children?: ReactNode;
  /** 처음 헤더 높이 (기본 64px) */
  tall?: number;
  /** 줄어든 비율 (기본 .75 → 64px 기준 48px) */
  shortScale?: number;
  /** 헤더 배경 (기본 어두운색) */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--tall"?: string; "--short-scale"?: number; "--color"?: string };

export default function ShrinkingHeader({
  logo,
  children,
  tall = 64,
  shortScale = 0.75,
  color = "#17141a",
  className = "",
}: ShrinkingHeaderProps) {
  const vars: Vars = { "--tall": `${tall}px`, "--short-scale": shortScale, "--color": color };

  return (
    <header className={`${styles.head} ${className}`} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <nav className={styles.nav}>{children}</nav>
    </header>
  );
}
