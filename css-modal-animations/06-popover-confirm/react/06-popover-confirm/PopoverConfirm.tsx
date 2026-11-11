import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PopoverConfirm.module.scss";

export type PopoverConfirmProps = {
  triggerLabel: string;
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm?: () => void;
  /** 뜨는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PopoverConfirm({
  triggerLabel,
  question,
  confirmLabel,
  cancelLabel,
  onConfirm,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: PopoverConfirmProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function show() {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void }) | null;
    if (el) {
      if (!el.hasAttribute("popover")) el.setAttribute("popover", "manual");
      el.showPopover?.();
    }
    setOpen(true);
  }
  function hide() {
    const el = ref.current as (HTMLDivElement & { hidePopover?: () => void }) | null;
    el?.hidePopover?.();
    setOpen(false);
  }

  return (
    <div className={styles.anchor} style={vars}>
      <button type="button" className={styles.trigger} onClick={show}>
        {triggerLabel}
      </button>
      <div ref={ref} className={open ? `${styles.confirm} ${styles.isOpen}` : styles.confirm}>
        <p>{question}</p>
        <div className={styles.row}>
          <button
            type="button"
            className={styles.yes}
            onClick={() => {
              onConfirm?.();
              hide();
            }}
          >
            {confirmLabel}
          </button>
          <button type="button" className={styles.no} onClick={hide}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
