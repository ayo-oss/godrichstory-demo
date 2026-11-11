import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./BreadcrumbPalette.module.scss";

export type BreadcrumbPaletteProps = {
  placeholder?: string;
  commands?: string[];
  targets?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

export default function BreadcrumbPalette({
  placeholder = "Search commands",
  commands = ["Invite to team", "Share document", "Copy link", "Move to archive"],
  targets = ["Design team", "Engineering team", "Marketing team", "Operations team"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BreadcrumbPaletteProps) {
  const [deep, setDeep] = useState(false);
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const rows = deep ? targets : commands;

  function enter() { setDeep(true); setQuery(""); setAt(-1); }
  function back() {
    setDeep(false); setQuery(""); setAt(-1);
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.pal} style={vars} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className={styles.bar}>
        {deep ? (
          <button className={styles.chip} type="button" onClick={back}>
            <span className={styles.chipic} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="11" height="11">
                <g fill="currentColor">
                  <path d="M168 100a60 60 0 1 1-60-60a60 60 0 0 1 60 60" opacity=".2" />
                  <path d="M256 136a8 8 0 0 1-8 8h-16v16a8 8 0 0 1-16 0v-16h-16a8 8 0 0 1 0-16h16v-16a8 8 0 0 1 16 0v16h16a8 8 0 0 1 8 8m-57.87 58.85a8 8 0 0 1-12.26 10.3C165.75 181.19 138.09 168 108 168s-57.75 13.19-77.87 37.15a8 8 0 0 1-12.25-10.3c14.94-17.78 33.52-30.41 54.17-37.17a68 68 0 1 1 71.9 0c20.65 6.76 39.23 19.39 54.18 37.17M108 152a52 52 0 1 0-52-52a52.06 52.06 0 0 0 52 52" />
                </g>
              </svg>
            </span>
            {commands[0]}
          </button>
        ) : null}
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="bc-list"
          aria-activedescendant={at >= 0 ? `bc-o${at}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e: ChangeEvt) => setQuery(e.target.value)}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), rows.length - 1)));
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              if (!deep && at === 0) enter(); else setPicked(rows[at]);
            } else if (e.key === "Backspace" && deep && !query) {
              // 빈 입력칸에서의 Backspace 는 글자가 아니라 한 단계를 지운다
              e.preventDefault();
              back();
            } else if (e.key === "Escape") {
              back();
            }
          }}
        />
      </div>
      <p className={styles.live} aria-live="polite">{deep ? commands[0] : ""}</p>
      <div className={styles.box}>
        <div className={styles.list} id="bc-list" role="listbox" aria-label={deep ? commands[0] : "Command palette"}>
          {rows.map((label, i) => (
            <div
              key={label}
              id={`bc-o${i}`}
              className={`${styles.opt} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={label === picked}
              tabIndex={-1}
              onMouseMove={() => setAt(i)}
              onClick={() => { if (!deep && i === 0) enter(); else setPicked(label); }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
