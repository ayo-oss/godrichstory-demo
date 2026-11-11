import type { CSSProperties } from "react";
import styles from "./SubmitButtonSuccessMorph.module.scss";

export type SubmitButtonSuccessMorphProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SubmitButtonSuccessMorph({ duration = 2000, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#4cd4a6" }: SubmitButtonSuccessMorphProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button type="button" className={styles.fv8} style={vars}>
      <span className={styles.label}>가입하기</span>
      <svg className={styles.spinner} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeDasharray="42 14" /></svg>
      <svg className={styles.check} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="4,13 9,18 20,6" /></svg>
    </button>
  );
}
