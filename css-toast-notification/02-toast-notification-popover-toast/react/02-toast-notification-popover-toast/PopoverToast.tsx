import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./PopoverToast.module.scss";

export type PopoverToastProps = {
  title: string;
  message: string;
  /** true 면 showPopover(), false 면 hidePopover() (기본 true) */
  open?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PopoverToast({
  title,
  message,
  open = true,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: PopoverToastProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (!el) return;
    if (open) el.showPopover?.();
    else el.hidePopover?.();
  }, [open]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div ref={ref} popover="" className={styles.toast} style={vars} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        <p className={styles.text}>{message}</p>
      </div>
    </div>
  );
}
