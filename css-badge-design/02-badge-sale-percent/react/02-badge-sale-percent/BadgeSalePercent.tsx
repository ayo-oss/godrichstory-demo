import type { CSSProperties } from "react";
import styles from "./BadgeSalePercent.module.scss";

export type BadgeSalePercentProps = {
  duration?: number;
  easing?: string;
  color?: string;
  percent?: number;
};

export default function BadgeSalePercent({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff4d1f",
  percent = 30,
}: BadgeSalePercentProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.tag} style={vars} aria-label={`${percent}% off`}>
      <span className={styles.hole} />
      <span className={styles.text}>-{percent}%</span>
    </div>
  );
}
