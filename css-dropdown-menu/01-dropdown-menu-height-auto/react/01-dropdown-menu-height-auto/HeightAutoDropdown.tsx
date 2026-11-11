import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HeightAutoDropdown.module.scss";

export type HeightAutoDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 패널이 늘어나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeightAutoDropdown({
  triggerLabel,
  items,
  duration = 300,
  easing = "ease-out",
  color = "#0a4fe8",
}: HeightAutoDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.menu} style={vars}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {triggerLabel}
      </button>
      <div className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        <ul className={styles.list}>
          {items.map((label) => (
            <li key={label}><a href="#">{label}</a></li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
