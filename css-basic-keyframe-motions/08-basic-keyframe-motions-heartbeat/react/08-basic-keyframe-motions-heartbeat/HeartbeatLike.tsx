import type { CSSProperties, ReactNode } from "react";
import styles from "./HeartbeatLike.module.scss";

export type HeartbeatLikeProps = {
  children: ReactNode;
  /** 한 박자가 걸리는 시간 (기본 1200ms) */
  duration?: number;
  /** CSS easing (기본 ease-in-out) */
  easing?: string;
  /** 하트 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function HeartbeatLike({
  children,
  duration = 1200,
  easing = "ease-in-out",
  color = "#2f6df6",
}: HeartbeatLikeProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.like} style={vars}>
      <span className={styles.heart} aria-hidden="true" />
      {children}
    </div>
  );
}
