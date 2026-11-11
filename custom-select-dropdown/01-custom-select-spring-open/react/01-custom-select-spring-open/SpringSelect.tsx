import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpringSelect.module.scss";

export type SpringSelectProps = {
  label?: string;
  options?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

export default function SpringSelect({
  label = "Shipping method",
  options = ["Standard", "Dawn delivery", "Same day", "Store pickup"],
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: SpringSelectProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  function pick(i: number) {
    setPicked(i);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.ss} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <span className={styles.label} id="ss-label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        className={styles.btn}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="ss-list"
        onClick={() => setOpen((o) => !o)}
      >
        <span>{options[picked]}</span>
        <span className={styles.caret} aria-hidden="true">▾</span>
      </button>
      <ul
        ref={listRef}
        id="ss-list"
        className={styles.list}
        role="listbox"
        aria-labelledby="ss-label"
        aria-activedescendant={`ss-o${active}`}
        tabIndex={-1}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown") { setActive((a) => Math.min(a + 1, options.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter" || e.key === " ") { pick(active); e.preventDefault(); }
          else if (e.key === "Escape") { setOpen(false); btnRef.current?.focus({ preventScroll: true }); }
        }}
      >
        {options.map((o, i) => (
          <li
            key={o}
            id={`ss-o${i}`}
            className={`${styles.opt} ${i === active ? styles.isActive : ""}`}
            role="option"
            aria-selected={i === picked}
            onMouseMove={() => setActive(i)}
            onClick={() => pick(i)}
          >
            <span>{o}</span>
            <span className={styles.tick} aria-hidden="true">{i === picked ? "●" : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
