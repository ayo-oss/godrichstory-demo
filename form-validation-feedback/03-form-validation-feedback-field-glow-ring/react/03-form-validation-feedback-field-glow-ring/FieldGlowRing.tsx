import type { CSSProperties } from "react";
import styles from "./FieldGlowRing.module.scss";

export type FieldGlowRingProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FieldGlowRing({ duration = 2000, easing = "cubic-bezier(.2,.8,.2,1)", color = "#4cd4a6" }: FieldGlowRingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.fv3} style={vars}>
      <span className={styles.field}>
        <input className={styles.input} type="text" defaultValue="ok@godrich.dev" readOnly />
        <span className={styles.glow} aria-hidden="true" />
      </span>
    </div>
  );
}
