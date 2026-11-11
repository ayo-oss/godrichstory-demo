import type { CSSProperties, ReactNode } from "react";
import styles from "./BubblePopIn.module.scss";

export type BubblePopInProps = {
  children: ReactNode;
  /** 팝 등장이 끝나는 데 걸리는 시간 (기본 220ms) */
  duration?: number;
  /** easing (기본 오버슈트 포지션) */
  easing?: string;
  /** 말풍선 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function BubblePopIn({
  children,
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
  className = "",
}: BubblePopInProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  return (
    <div className={`${styles.bubble} ${styles.enter} ${className}`} style={vars}>
      {children}
    </div>
  );
}
