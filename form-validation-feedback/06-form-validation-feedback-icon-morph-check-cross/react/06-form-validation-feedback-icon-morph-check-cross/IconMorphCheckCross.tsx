import type { CSSProperties } from "react";
import styles from "./IconMorphCheckCross.module.scss";

export type IconMorphCheckCrossProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function IconMorphCheckCross({ duration = 2000, easing = "ease-out", color = "#17141a" }: IconMorphCheckCrossProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv6} style={vars}>
      <span className={styles.field}>
        <input className={styles.input} type="text" defaultValue="godrich01" readOnly />
        <span className={styles.icon}>
          <svg className={styles.spinner} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><circle cx="12" cy="12" r="9" strokeDasharray="42 14" /></svg>
          <svg className={styles.check} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="4,13 9,18 20,6" /></svg>
          <svg className={styles.cross} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><line x1={6} y1={6} x2={18} y2={18} /><line x1={18} y1={6} x2={6} y2={18} /></svg>
        </span>
      </span>
    </div>
  );
}
