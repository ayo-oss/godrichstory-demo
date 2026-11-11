import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CommandPalette.module.scss";

export type CommandPaletteProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const COMMANDS = [
  { id: "event", label: "Add new event", kw: "event calendar schedule" },
  { id: "tags", label: "Manage tags", kw: "tag label" },
  { id: "profile", label: "Profile settings", kw: "profile account settings" },
  { id: "export", label: "Export file", kw: "export download csv" },
];

export default function CommandPalette({ duration = 220, easing = "cubic-bezier(.2,1.4,.4,1)", color = "#fff7e6" }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const visible = COMMANDS.filter((c) => !query.trim() || c.kw.includes(query.trim().toLowerCase()));

  function openPalette() {
    setOpen(true); setQuery(""); setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }
  function close() {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      else if (e.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className={styles.cp} style={vars}>
      <button ref={triggerRef} type="button" className={styles.trigger} onClick={openPalette}>
        🔍 Quick jump <kbd className={styles.kbd}>Ctrl K</kbd>
      </button>
      {open && (
        <div className={styles.overlay} onClick={(e: any) => { if (e.target === e.currentTarget) close(); }}>
          <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Command palette">
            <div className={styles.searchRow}>
              🔍
              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                placeholder="Search commands…"
                aria-label="Command search"
                value={query}
                onChange={(e: any) => { setQuery(e.target.value); setActive(0); }}
                onKeyDown={(e: any) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, visible.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter" && visible[active]) close();
                }}
              />
            </div>
            <ul className={styles.list} role="listbox">
              {visible.map((c, i) => (
                <li key={c.id} className={`${styles.item} ${i === active ? styles.active : ""}`} role="option" onClick={close}>
                  {c.label}
                </li>
              ))}
            </ul>
            {visible.length === 0 && <p className={styles.empty}>No matching commands</p>}
          </div>
        </div>
      )}
    </div>
  );
}
