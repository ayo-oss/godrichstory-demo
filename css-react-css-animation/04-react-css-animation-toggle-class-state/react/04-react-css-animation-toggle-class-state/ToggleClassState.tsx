import { CSSProperties, useState } from "react";
import styles from "./ToggleClassState.module.scss";

export interface ToggleClassStateProps {
  duration?: string;
  easing?: string;
}

export default function ToggleClassState({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
}: ToggleClassStateProps) {
  // The idiomatic React pattern: one boolean state maps straight onto one className.
  // Everything visual in between is CSS's job, not this component's.
  const [open, setOpen] = useState(false);

  const style: CSSProperties & { "--duration"?: string; "--easing"?: string } = {
    "--duration": duration,
    "--easing": easing,
  };

  return (
    <div className={`${styles.panel} ${open ? styles.open : ""}`} style={style}>
      <button className={styles.head} onClick={() => setOpen((v) => !v)}>
        <span className={styles.label}>Shipping details</span>
        <span className={styles.chevron}>▾</span>
      </button>
      <div className={styles.body}>Arrives in 2–3 business days via standard mail.</div>
    </div>
  );
}
