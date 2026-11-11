import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecentActionsPalette.module.scss";

export type PaletteGroup = { title: string; items: string[] };

export type RecentActionsPaletteProps = {
  placeholder?: string;
  groups?: PaletteGroup[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; metaKey: boolean; ctrlKey: boolean; preventDefault: () => void };

const DEFAULT_GROUPS: PaletteGroup[] = [
  { title: "Recent", items: ["Weekly report draft", "Budget sheet"] },
  { title: "Go to", items: ["Dashboard", "Settings"] },
];

export default function RecentActionsPalette({
  placeholder = "Search commands",
  groups = DEFAULT_GROUPS,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RecentActionsPaletteProps) {
  const [open, setOpen] = useState(true);
  const [at, setAt] = useState(-1);
  const [ran, setRan] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const flat = groups.flatMap((g, gi) => g.items.map((label, ii) => ({ label, id: `cmdk-${gi}-${ii}` })));

  // ⌘K / Ctrl+K 는 문서 전체에서 듣는다 — 팔레트가 닫혀 있을 때도 열려야 하기 때문
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

  if (!open) return null;

  return (
    <div className={styles.pal} style={vars} role="dialog" aria-modal="true" aria-label="Command palette">
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
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={at >= 0 ? flat[at].id : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), flat.length - 1)));
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              setRan(at);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <kbd className={styles.kbd}>⌘K</kbd>
      </div>
      <div className={styles.list} id="cmdk-list" role="listbox" aria-label="Command palette">
        {groups.map((g, gi) => (
          <div className={styles.grp} key={g.title} role="group" aria-labelledby={`cmdk-h-${gi}`}>
            <p className={styles.head} id={`cmdk-h-${gi}`}>{g.title}</p>
            {g.items.map((label) => {
              const i = flat.findIndex((f) => f.label === label);
              return (
                <div
                  key={label}
                  id={flat[i].id}
                  className={`${styles.opt} ${i === at ? styles.isAt : ""} ${i === ran ? styles.isRun : ""}`}
                  role="option"
                  aria-selected={i === ran}
                  tabIndex={-1}
                  onMouseMove={() => setAt(i)}
                  onClick={() => { setAt(i); setRan(i); }}
                >
                  <span className={styles.name}>{label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
