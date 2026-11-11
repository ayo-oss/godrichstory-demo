import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SortDropdownCheckmarkMenu.module.scss";

export type SortDropdownCheckmarkMenuProps = {
  options?: string[];
  duration?: number;
  easing?: string;
  checkColor?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--check"?: string };

export default function SortDropdownCheckmarkMenu({
  options = ["Newest", "Oldest", "Price: high to low", "Price: low to high"],
  duration = 200,
  easing = "cubic-bezier(.2,.8,.2,1)",
  checkColor = "#2f6df6",
}: SortDropdownCheckmarkMenuProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(options[0]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--check": checkColor };

  return (
    <div className={styles.sd} style={vars} onKeyDown={(e: { key: string }) => e.key === "Escape" && setOpen(false)}>
      <button type="button" className={styles.trigger} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Sort: {current}
      </button>
      <ul className={styles.menu} role="menu" data-open={open}>
        {options.map((label) => (
          <li
            key={label}
            role="menuitemradio"
            aria-checked={current === label}
            className={styles.item}
            data-checked={current === label}
            onClick={() => { setCurrent(label); setOpen(false); }}
          >
            <span className={styles.check} aria-hidden="true">
              <svg viewBox="0 0 256 256">
                <g fill="currentColor"><path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" /><path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" /></g>
              </svg>
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
