import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MegaMenuFillDropdown.module.scss";

export type MegaMenuFillDropdownProps = {
  triggerLabel: string;
  categories: string[];
  /** 배경이 번지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MegaMenuFillDropdown({
  triggerLabel,
  categories,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: MegaMenuFillDropdownProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <nav className={styles.menu} style={vars}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      <div className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        <div className={styles.fill} />
        <div className={styles.grid}>
          {categories.map((label) => (
            <a key={label} href="#">{label}</a>
          ))}
        </div>
      </div>
    </nav>
  );
}
