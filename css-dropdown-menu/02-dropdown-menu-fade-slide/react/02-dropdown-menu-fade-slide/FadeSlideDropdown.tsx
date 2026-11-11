import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FadeSlideDropdown.module.scss";

export type FadeSlideDropdownProps = {
  triggerLabel: string;
  items: string[];
  /** 페이드+슬라이드 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FadeSlideDropdown({
  triggerLabel,
  items,
  duration = 220,
  easing = "ease-out",
  color = "#17141a",
}: FadeSlideDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <nav className={styles.menu} style={vars} ref={ref}>
      <button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {triggerLabel}
      </button>
      <ul className={open ? `${styles.panel} ${styles.panelOpen}` : styles.panel}>
        {items.map((label) => (
          <li key={label}><a href="#">{label}</a></li>
        ))}
      </ul>
    </nav>
  );
}
