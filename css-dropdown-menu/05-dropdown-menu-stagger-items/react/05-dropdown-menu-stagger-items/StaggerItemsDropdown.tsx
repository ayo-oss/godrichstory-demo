import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StaggerItemsDropdown.module.scss";

export type StaggerItemsDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 항목 하나가 나타나는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 항목 사이 시차 ms (기본 20ms) */
  stagger?: number;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StaggerItemsDropdown({
  triggerLabel,
  items,
  duration = 220,
  easing = "ease-out",
  stagger = 20,
  color = "#0a4fe8",
}: StaggerItemsDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.menu} style={vars}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        {items.map((label, i) => (
          <li key={label} style={{ transitionDelay: open ? `${i * stagger}ms` : "0ms" }}>
            <a href="#">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
