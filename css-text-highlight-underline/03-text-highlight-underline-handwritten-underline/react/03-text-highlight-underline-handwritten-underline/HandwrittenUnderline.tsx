import type { CSSProperties, ReactNode } from "react";
import styles from "./HandwrittenUnderline.module.scss";

export type HandwrittenUnderlineProps = {
  /** 밑줄이 걸리는 강조어 */
  keyword: ReactNode;
  /** 강조어 뒤 문장 */
  after?: ReactNode;
  /** 한 획을 긋는 데 걸리는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 밑줄 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function HandwrittenUnderline({
  keyword,
  after,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
}: HandwrittenUnderlineProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.quote} style={vars}>
      “<span className={styles.hl}>{keyword}</span>{after}
      <svg className={styles.svg} viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden="true">
        <path className={styles.path} d="M2 12 C 20 18, 45 6, 62 11 S 100 17, 118 9" />
      </svg>
    </p>
  );
}
