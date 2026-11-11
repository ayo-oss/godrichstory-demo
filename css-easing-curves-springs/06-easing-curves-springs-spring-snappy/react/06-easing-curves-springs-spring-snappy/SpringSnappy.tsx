import type { CSSProperties } from "react";
import styles from "./SpringSnappy.module.scss";

export type SpringSnappyProps = {
  duration?: number;
  color?: string;
};

export default function SpringSnappy({ duration = 2000, color = "#17141a" }: SpringSnappyProps) {
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
