import type { CSSProperties, ReactNode } from "react";
import styles from "./HighlightMarker.module.scss";

export type HighlightMarkerProps = {
  /** 강조어 앞 글자 */
  before: ReactNode;
  /** 형광펜이 칠해지는 단어 */
  keyword: ReactNode;
  /** 강조어 뒤 글자 */
  after?: ReactNode;
  /** 칠해지는 데 걸리는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 형광펜 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function HighlightMarker({
  before,
  keyword,
  after,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: HighlightMarkerProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.line}>
      {before} <span className={styles.hl} style={vars}>{keyword}</span> {after}
    </p>
  );
}
