import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MobileFullSheetDropdown.module.scss";

export type MobileFullSheetDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 시트가 올라오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MobileFullSheetDropdown({
  triggerLabel,
  items,
  duration = 300,
  easing = "ease-out",
  color = "#0a4fe8",
}: MobileFullSheetDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div className={styles.stage} ref={ref} style={vars}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      <ul className={open ? `${styles.sheet} ${styles.sheetOpen}` : styles.sheet}>
        {items.map((label) => (
          <li key={label}><a href="#">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}
