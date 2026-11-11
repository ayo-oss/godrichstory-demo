import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SideDrawer.module.scss";

export type SideDrawerProps = {
  triggerLabel: string;
  title: string;
  description: string;
  closeLabel: string;
  /** 패널이 밀려 들어오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SideDrawer({
  triggerLabel,
  title,
  description,
  closeLabel,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SideDrawerProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      <div
        className={open ? `${styles.overlay} ${styles.isOpen}` : styles.overlay}
        onClick={() => setOpen(false)}
      />
      <div
        className={open ? `${styles.drawer} ${styles.isOpen}` : styles.drawer}
        role="dialog"
        aria-modal="true"
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
