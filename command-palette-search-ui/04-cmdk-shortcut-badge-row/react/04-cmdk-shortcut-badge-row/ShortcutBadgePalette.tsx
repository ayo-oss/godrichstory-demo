import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ShortcutBadgePalette.module.scss";

export type ShortcutRow = { label: string; keys: string[]; accel: string };

export type ShortcutBadgePaletteProps = {
  placeholder?: string;
  rows?: ShortcutRow[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const DEFAULT_ROWS: ShortcutRow[] = [
  { label: "New document", keys: ["⌘", "N"], accel: "n" },
  { label: "Search", keys: ["⌘", "F"], accel: "f" },
  { label: "Save", keys: ["⌘", "S"], accel: "s" },
  { label: "Open settings", keys: ["⌘", ","], accel: "," },
];

export default function ShortcutBadgePalette({
  placeholder = "Search commands",
  rows = DEFAULT_ROWS,
  duration = 140,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ShortcutBadgePaletteProps) {
  const [at, setAt] = useState(-1);
  const [ran, setRan] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 배지에 적힌 조합을 실제로 치면 그 줄이 실행된다 — 치트시트가 장식이 아니게 하는 부분
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const i = rows.findIndex((r) => r.accel === e.key.toLowerCase());
      if (i < 0) return;
      e.preventDefault();
      setAt(i);
      setRan(i);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [rows]);

  return (
    <div className={styles.pal} style={vars} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className={styles.bar}>
        <span className={styles.mag} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="13" height="13">
            <g fill="currentColor">
              <path d="M224 56v144a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M128 128a8 8 0 0 1-3 6.25l-40 32a8 8 0 1 1-10-12.5L107.19 128L75 102.25a8 8 0 1 1 10-12.5l40 32a8 8 0 0 1 3 6.25m48 24h-40a8 8 0 0 0 0 16h40a8 8 0 0 0 0-16m56-96v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16m-16 144V56H40v144z" />
            </g>
          </svg>
        </span>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="sb-list"
          aria-activedescendant={at >= 0 ? `sb-o${at}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), rows.length - 1)));
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              setRan(at);
            } else if (e.key === "Escape") {
              setAt(-1); setRan(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={styles.list} id="sb-list" role="listbox" aria-label="Command palette">
        {rows.map((row, i) => (
          <div
            key={row.label}
            id={`sb-o${i}`}
            className={`${styles.opt} ${i === at ? styles.isAt : ""} ${i === ran ? styles.isRun : ""}`}
            role="option"
            aria-selected={i === ran}
            tabIndex={-1}
            onMouseMove={() => setAt(i)}
            onClick={() => { setAt(i); setRan(i); }}
          >
            <span className={styles.name}>{row.label}</span>
            <span className={styles.keys}>
              {row.keys.map((k) => <kbd className={styles.kbd} key={k}>{k}</kbd>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
