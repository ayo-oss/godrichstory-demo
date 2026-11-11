import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BackdropBlurModal.module.scss";

export type BackdropBlurModalProps = {
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  /** 배경이 흐려지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BackdropBlurModal({
  triggerLabel,
  title,
  description,
  confirmLabel,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
}: BackdropBlurModalProps) {
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.page}>
        <div className={`${styles.line} ${styles.lineA}`} />
        <div className={`${styles.line} ${styles.lineB}`} />
        <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
          {triggerLabel}
        </button>
      </div>
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
