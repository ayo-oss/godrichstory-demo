import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CustomSelectOpen.module.scss";

export type CustomSelectOpenProps = {
  id?: string;
  label?: string;
  options?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CustomSelectOpen({
  id = "cs-btn",
  label = "Choose theme",
  options = ["Light", "Dark", "System"],
  duration = 220,
  easing = "cubic-bezier(.3,1.5,.4,1)",
  color = "#17141a",
}: CustomSelectOpenProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={open ? `${styles.cs} ${styles.open}` : styles.cs} style={vars}>
      <button
        type="button"
        id={id}
        className={styles.btn}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      <ul className={styles.list} role="listbox" aria-labelledby={id}>
        {options.map((opt) => (
          <li key={opt} role="option" className={styles.opt}>{opt}</li>
        ))}
      </ul>
      <span className={styles.bloom} aria-hidden="true" />
    </div>
  );
}
