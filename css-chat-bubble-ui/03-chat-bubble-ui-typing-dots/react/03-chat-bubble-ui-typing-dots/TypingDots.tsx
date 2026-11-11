import type { CSSProperties } from "react";
import styles from "./TypingDots.module.scss";

export type TypingDotsProps = {
  /** 점 하나가 튀는 데 걸리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TypingDots({
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
  className = "",
}: TypingDotsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={`${styles.bubble} ${className}`} style={vars}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}
