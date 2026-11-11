import type { CSSProperties } from "react";
import styles from "./DashedRunFrame.module.scss";

export type DashedRunFrameProps = {
  label: string;
  pct: string;
  /** 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 점선 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DashedRunFrame({
  label,
  pct,
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: DashedRunFrameProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.frame} style={vars}>
      <span className={`${styles.edge} ${styles.top}`} aria-hidden="true" />
      <span className={`${styles.edge} ${styles.right}`} aria-hidden="true" />
      <span className={`${styles.edge} ${styles.bottom}`} aria-hidden="true" />
      <span className={`${styles.edge} ${styles.left}`} aria-hidden="true" />
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.pct}>{pct}</p>
      </div>
    </div>
  );
}
