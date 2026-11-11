import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SheetPalette.module.scss";

export type SheetPaletteProps = {
  placeholder?: string;
  options?: string[];
  closeLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

export default function SheetPalette({
  placeholder = "Search commands",
  options = ["Create document", "Invite member", "Open settings"],
  closeLabel = "Close palette",
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SheetPaletteProps) {
  const [open, setOpen] = useState(true);
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
    else setAt(-1);
  }, [open]);

  return (
    <div className={`${styles.ph} ${open ? styles.isOpen : ""}`} style={vars}>
      <div className={styles.page} aria-hidden="true">
        {[56, 84, 72, 40].map((w) => <span className={styles.ln} style={{ width: `${w}%` }} key={w} />)}
      </div>
      <span className={styles.dim} aria-hidden="true" />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Command palette">
        {/* 손잡이 막대는 장식이 아니라 닫는 버튼이다 — 터치에서 시트를 내리는 유일한 길 */}
        <button className={styles.grab} type="button" aria-label={closeLabel} onClick={() => setOpen(false)} />
        <div className={styles.bar}>
          <span className={styles.mag} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="13" height="13">
              <g fill="currentColor">
                <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
                <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
              </g>
            </svg>
          </span>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="ms-list"
            aria-activedescendant={at >= 0 ? `ms-o${at}` : undefined}
            aria-label={placeholder}
            placeholder={placeholder}
            autoComplete="off"
            onKeyDown={(e: KeyEvt) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), options.length - 1)));
              } else if (e.key === "Enter" && at >= 0) {
                e.preventDefault();
                setPicked(options[at]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>
        <div className={styles.list} id="ms-list" role="listbox" aria-label="Command palette">
          {options.map((label, i) => (
            <div
              key={label}
              id={`ms-o${i}`}
              className={`${styles.opt} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={label === picked}
              tabIndex={-1}
              onMouseMove={() => setAt(i)}
              onClick={() => setPicked(label)}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
