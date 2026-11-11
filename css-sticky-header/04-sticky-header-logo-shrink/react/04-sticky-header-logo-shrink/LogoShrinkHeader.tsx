import type { CSSProperties, ReactNode } from "react";
import styles from "./LogoShrinkHeader.module.scss";

export type LogoShrinkHeaderProps = {
  logo: string;
  children?: ReactNode;
  /** 로고가 줄어드는 시간 (기본 600ms) — 실제 사용은 scroll() 타임라인이 대신한다 */
  duration?: number;
  easing?: string;
  /** 줄어든 비율 (기본 .72) */
  scaleTo?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--scale-to"?: number };

export default function LogoShrinkHeader({
  logo,
  children,
  duration = 600,
  easing = "ease-out",
  scaleTo = 0.72,
}: LogoShrinkHeaderProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--scale-to": scaleTo };

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>
        <span className={styles.mark} aria-hidden="true" />
        {logo}
      </span>
      <nav className={styles.nav}>{children}</nav>
    </header>
  );
}
