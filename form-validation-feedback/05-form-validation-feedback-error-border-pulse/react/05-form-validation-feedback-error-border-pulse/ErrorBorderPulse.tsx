import type { CSSProperties } from "react";
import styles from "./ErrorBorderPulse.module.scss";

export type ErrorBorderPulseProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ErrorBorderPulse({ duration = 2000, easing = "ease-out", color = "#c2361a" }: ErrorBorderPulseProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv5} style={vars}>
      <span className={styles.field}>
        <input className={styles.input} type="text" defaultValue="01021" readOnly />
        <span className={styles.ring} aria-hidden="true" />
      </span>
      <p className={styles.msg}>숫자만 4자리 이상 입력해 주세요</p>
    </div>
  );
}
