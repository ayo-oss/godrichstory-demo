import type { CSSProperties } from "react";
import styles from "./LightDarkGlow.module.scss";

export type LightDarkGlowProps = {
  /** 숨쉬기 한 번 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function LightDarkGlow({ duration = 2000, color = "#7c5cff" }: LightDarkGlowProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <div className={styles.row} style={vars}>
      <div className={`${styles.pane} ${styles.light}`}>
        <span className={styles.badge} />
      </div>
      <div className={`${styles.pane} ${styles.dark}`}>
        <span className={styles.badge} />
      </div>
    </div>
  );
}
