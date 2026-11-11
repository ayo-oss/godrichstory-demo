import type { CSSProperties } from "react";
import styles from "./BounceLinear.module.scss";

export type BounceLinearProps = {
  duration?: number;
  color?: string;
};

export default function BounceLinear({ duration = 2000, color = "#2f6df6" }: BounceLinearProps) {
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
