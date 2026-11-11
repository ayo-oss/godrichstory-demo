import type { CSSProperties } from "react";
import styles from "./IndeterminateBar.module.scss";

export type IndeterminateBarProps = {
  duration?: number;
  easing?: string;
  color?: string;
  /** 진행률을 모르므로 값이 아니라 상태만 알린다 */
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function IndeterminateBar({
  duration = 1600,
  easing = "cubic-bezier(.4,0,.2,1)",
  color = "#17141a",
  label = "Loading",
}: IndeterminateBarProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.track} style={vars} role="progressbar" aria-label={label}>
      <span className={`${styles.seg} ${styles.a}`} />
      <span className={`${styles.seg} ${styles.b}`} />
    </div>
  );
}
