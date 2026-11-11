import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScaleOriginDropdown.module.scss";

export type ScaleOriginDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 확대되는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ScaleOriginDropdown({
  triggerLabel,
  items,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: ScaleOriginDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.menu} style={vars}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        {items.map((label) => (
          <li key={label}><a href="#">{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
