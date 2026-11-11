import type { CSSProperties } from "react";
import styles from "./LabelColorShift.module.scss";

export type LabelColorShiftProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LabelColorShift({ duration = 2000, easing = "ease-out", color = "#4cd4a6" }: LabelColorShiftProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv2} style={vars}>
      <span className={styles.wrap}>
        <span className={`${styles.label} ${styles.neutral}`}>닉네임</span>
        <span className={`${styles.label} ${styles.ok}`}>사용할 수 있는 닉네임이에요</span>
      </span>
      <input className={styles.input} type="text" defaultValue="godrich_dev" readOnly />
    </div>
  );
}
