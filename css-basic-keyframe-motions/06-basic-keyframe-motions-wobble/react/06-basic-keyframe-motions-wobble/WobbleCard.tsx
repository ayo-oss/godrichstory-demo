import type { CSSProperties, ReactNode } from "react";
import styles from "./WobbleCard.module.scss";

export type WobbleCardProps = {
  children: ReactNode;
  /** 한 번 도는 데 걸리는 시간 (기본 1000ms) */
  duration?: number;
  /** CSS easing (기본 ease-in-out) */
  easing?: string;
  /** 글자·핸들 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function WobbleCard({
  children,
  duration = 1000,
  easing = "ease-in-out",
  color = "#17141a",
}: WobbleCardProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.card} style={vars}>
      <span className={styles.handle} aria-hidden="true">⋮⋮</span>
      {children}
    </div>
  );
}
