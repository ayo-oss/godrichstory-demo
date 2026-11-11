import type { CSSProperties } from "react";
import styles from "./CornerBracketsFrame.module.scss";

export type CornerBracketsFrameProps = {
  label: string;
  /** 브래킷이 벌어지는 시간 (기본 2000ms, 루프용) */
  duration?: number;
  easing?: string;
  /** 브래킷 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CornerBracketsFrame({
  label,
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: CornerBracketsFrameProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.frame} style={vars} tabIndex={0}>
      <span className={`${styles.bracket} ${styles.tl}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.tr}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bl}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.br}`} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
