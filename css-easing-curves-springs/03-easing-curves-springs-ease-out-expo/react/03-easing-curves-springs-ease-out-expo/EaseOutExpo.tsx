import type { CSSProperties } from "react";
import styles from "./EaseOutExpo.module.scss";

export type EaseOutExpoProps = {
  duration?: number;
  color?: string;
};

export default function EaseOutExpo({ duration = 2000, color = "#fff7e6" }: EaseOutExpoProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.track}>
        <span className={`${styles.dot} ${styles.dotStart}`} />
        <span className={`${styles.dot} ${styles.dotEnd}`} />
        <div className={styles.puck} />
      </div>
    </div>
  );
}
