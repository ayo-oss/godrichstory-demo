import type { CSSProperties } from "react";
import styles from "./EaseOutQuart.module.scss";

export type EaseOutQuartProps = {
  /** 왕복 한 주기 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function EaseOutQuart({ duration = 2000, color = "#2f6df6" }: EaseOutQuartProps) {
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
