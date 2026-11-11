import type { CSSProperties, ReactNode } from "react";
import styles from "./ThemeWipeTransition.module.scss";

export type ThemeWipeTransitionProps = {
  active: "light" | "dark";
  light: ReactNode;
  dark: ReactNode;
  /** 와이프가 다 덮는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ThemeWipeTransition({
  active,
  light,
  dark,
  duration = 600,
  easing = "ease-out",
  className = "",
}: ThemeWipeTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <section className={styles.light}>{light}</section>
      <section className={styles.dark}>{dark}</section>
    </div>
  );
}
