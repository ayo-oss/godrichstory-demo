import type { CSSProperties } from "react";
import styles from "./SuccessBounceCheck.module.scss";

export type SuccessBounceCheckProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SuccessBounceCheck({ duration = 600, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#4cd4a6" }: SuccessBounceCheckProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv4} style={vars}>
      <span className={styles.badge}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <polyline className={styles.path} points="4,13 9,18 20,6" />
        </svg>
      </span>
      <span className={styles.text}>저장됐어요</span>
    </div>
  );
}
