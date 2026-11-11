import type { CSSProperties, ReactNode } from "react";
import styles from "./DottedGrow.module.scss";

export type DottedGrowProps = {
  before: ReactNode;
  keyword: ReactNode;
  after?: ReactNode;
  /** 점선이 다 자라는 시간 (기본 700ms) */
  duration?: number;
  easing?: string;
  /** 점선 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function DottedGrow({
  before,
  keyword,
  after,
  duration = 700,
  easing = "ease-out",
  color = "#17141a",
}: DottedGrowProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line} style={vars}>
      {before} <span className={styles.hl}>{keyword}<span className={styles.dots} aria-hidden="true" /></span>{after}
    </p>
  );
}
