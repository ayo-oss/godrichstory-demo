import type { CSSProperties } from "react";
import styles from "./PasswordStrengthFill.module.scss";

export type PasswordStrengthFillProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PasswordStrengthFill({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#4cd4a6" }: PasswordStrengthFillProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv7} style={vars}>
      <input className={styles.input} type="password" defaultValue="********" readOnly />
      <div className={styles.track}>
        <span className={`${styles.fill} ${styles.weak}`} />
        <span className={`${styles.fill} ${styles.mid}`} />
        <span className={`${styles.fill} ${styles.strong}`} />
      </div>
    </div>
  );
}
