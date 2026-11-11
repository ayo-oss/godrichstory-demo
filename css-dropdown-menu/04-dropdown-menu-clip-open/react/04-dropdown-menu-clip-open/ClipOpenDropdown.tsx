import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ClipOpenDropdown.module.scss";

export type ClipOpenDropdownProps = {
  title: string;
  moreLabel: string;
  items: string[];
  /** 클립이 펼쳐지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ClipOpenDropdown({
  title,
  moreLabel,
  items,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: ClipOpenDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.card} style={vars}>
      <span className={styles.title}>{title}</span>
      <nav className={styles.menu}>
        <button type="button" className={styles.trigger} aria-expanded={open} aria-label={moreLabel} onClick={() => setOpen((v) => !v)}>
          ⋯
        </button>
        <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
          {items.map((label) => (
            <li key={label}><a href="#">{label}</a></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
