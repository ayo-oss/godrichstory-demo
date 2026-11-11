import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NativeDialog.module.scss";

export type NativeDialogProps = {
  triggerLabel: string;
  title: string;
  description: string;
  closeLabel: string;
  /** 대화상자가 뜨는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NativeDialog({
  triggerLabel,
  title,
  description,
  closeLabel,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: NativeDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <div className={styles.stage} style={vars}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        className={styles.modal}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        <button type="button" className={styles.close} onClick={() => setOpen(false)}>
          {closeLabel}
        </button>
      </dialog>
    </div>
  );
}
