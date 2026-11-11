import type { CSSProperties } from "react";
import styles from "./EaseInOutBack.module.scss";

export type EaseInOutBackProps = {
  duration?: number;
  color?: string;
};

export default function EaseInOutBack({ duration = 2000, color = "#17141a" }: EaseInOutBackProps) {
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
