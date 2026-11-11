import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PopoverMenu.module.scss";

export type PopoverMenuProps = {
  links: string[];
  openLabel: string;
  closeLabel: string;
  label: string;
  /** 메뉴가 뜨는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PopoverMenu({
  links,
  openLabel,
  closeLabel,
  label,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: PopoverMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    const el = ref.current as (HTMLDivElement & { showPopover?: () => void; hidePopover?: () => void }) | null;
    if (el) {
      if (!el.hasAttribute("popover")) el.setAttribute("popover", "manual");
      if (open) el.hidePopover?.();
      else el.showPopover?.();
    }
    setOpen((v) => !v);
  }

  return (
    <div className={styles.anchor} style={vars}>
      <button type="button" className={styles.burger} aria-label={open ? closeLabel : openLabel} onClick={toggle}>
        <span className={`${styles.bar} ${open ? `${styles.bar1} ${styles.isOpen}` : styles.bar1}`} />
        <span className={`${styles.bar} ${open ? `${styles.bar2} ${styles.isOpen}` : styles.bar2}`} />
        <span className={`${styles.bar} ${open ? `${styles.bar3} ${styles.isOpen}` : styles.bar3}`} />
      </button>
      <div ref={ref} className={open ? `${styles.menu} ${styles.isOpen}` : styles.menu} aria-label={label}>
        {links.map((l) => (
          <a key={l} className={styles.menuLink} href="#">
            {l}
          </a>
        ))}
      </div>
    </div>
  );
}
