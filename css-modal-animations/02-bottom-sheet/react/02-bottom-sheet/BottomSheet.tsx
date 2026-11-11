import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BottomSheet.module.scss";

export type BottomSheetProps = {
  triggerLabel: string;
  title: string;
  description: string;
  closeLabel: string;
  /** 시트가 올라오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BottomSheet({
  triggerLabel,
  title,
  description,
  closeLabel,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: BottomSheetProps) {
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
        className={open ? `${styles.sheet} ${styles.isOpen}` : styles.sheet}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.handle} />
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          {closeLabel}
        </button>
      </div>
    </div>
  );
}
