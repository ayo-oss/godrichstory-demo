import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ModalFadeScale.module.scss";

export type ModalFadeScaleProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** 열리는 시간 (기본 220ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ModalFadeScale({
  triggerLabel,
  title,
  description,
  confirmLabel,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ModalFadeScaleProps) {
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
        className={open ? `${styles.modal} ${styles.isOpen}` : styles.modal}
        role="dialog"
        aria-modal="true"
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.confirm} onClick={() => setOpen(false)}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
