import type { CSSProperties, ReactNode } from "react";
import styles from "./SlideTransition.module.scss";

export type SlideTransitionProps = {
  active: "a" | "b";
  pageA: ReactNode;
  pageB: ReactNode;
  /** 전환 시간 (기본 220ms) */
  duration?: number;
  /** easing (기본 spring 느낌) */
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SlideTransition({
  active,
  pageA,
  pageB,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  className = "",
}: SlideTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <section className={styles.pageA}>{pageA}</section>
      <section className={styles.pageB}>{pageB}</section>
    </div>
  );
}
