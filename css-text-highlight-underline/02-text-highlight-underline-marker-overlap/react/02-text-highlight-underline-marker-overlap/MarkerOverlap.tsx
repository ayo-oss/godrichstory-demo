import type { CSSProperties, ReactNode } from "react";
import styles from "./MarkerOverlap.module.scss";

export type MarkerOverlapProps = {
  before: ReactNode;
  keyword: ReactNode;
  after?: ReactNode;
  duration?: number;
  easing?: string;
  /** 두 번째(위) 스트로크 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function MarkerOverlap({
  before,
  keyword,
  after,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: MarkerOverlapProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line}>
      {before} <span className={styles.hl} style={vars}>{keyword}</span>{after}
    </p>
  );
}
