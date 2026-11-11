import type { CSSProperties } from "react";
import styles from "./ReducedMotionSafeStatus.module.scss";

export type ReducedMotionSafeStatusProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ReducedMotionSafeStatus({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#4cd4a6" }: ReducedMotionSafeStatusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv9} style={vars}>
      <span className={styles.field}>
        <input className={styles.input} type="text" defaultValue="godrich@site.com" readOnly />
        <span className={styles.status}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="4,13 9,18 20,6" /></svg>
        </span>
      </span>
      <p className={styles.msg}>확인됐어요</p>
    </div>
  );
}
