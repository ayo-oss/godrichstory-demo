import type { CSSProperties, ReactNode } from "react";
import styles from "./ColorFadeToggle.module.scss";

export type ColorFadeToggleProps = {
  dark: boolean;
  /** 전체 페이드가 끝나는 시간 (기본 800ms) */
  duration?: number;
  easing?: string;
  lightContent: ReactNode;
  darkContent: ReactNode;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ColorFadeToggle({
  dark,
  duration = 800,
  easing = "ease-out",
  lightContent,
  darkContent,
  className = "",
}: ColorFadeToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <div className={`${styles.panel} ${className}`} style={vars} data-dark={dark}>
      <div className={styles.light}>{lightContent}</div>
      <div className={styles.dark}>{darkContent}</div>
    </div>
  );
}
