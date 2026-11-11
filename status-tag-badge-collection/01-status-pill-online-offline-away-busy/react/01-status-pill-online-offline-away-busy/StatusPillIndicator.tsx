import type { CSSProperties } from "react";
import styles from "./StatusPillIndicator.module.scss";

export type StatusPillIndicatorProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function StatusPillIndicator({
  duration = 2000,
  easing = "ease-out",
  color = "#16a34a",
}: StatusPillIndicatorProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <ul className={styles.pills} style={vars} aria-label="status list">
      <li className={`${styles.pill} ${styles.online}`}><span className={styles.dot} />Online</li>
      <li className={`${styles.pill} ${styles.away}`}><span className={styles.dot} />Away</li>
      <li className={`${styles.pill} ${styles.busy}`}><span className={styles.dot} />Busy</li>
      <li className={`${styles.pill} ${styles.offline}`}><span className={styles.dot} />Offline</li>
    </ul>
  );
}
