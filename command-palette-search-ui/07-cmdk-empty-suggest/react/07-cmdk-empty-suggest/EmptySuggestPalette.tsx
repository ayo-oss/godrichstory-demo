import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmptySuggestPalette.module.scss";

export type EmptySuggestPaletteProps = {
  placeholder?: string;
  options?: string[];
  emptyText?: string;
  suggestions?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

export default function EmptySuggestPalette({
  placeholder = "Search commands",
  options = ["Create document", "Invite member", "Open settings"],
  emptyText = "No results",
  suggestions = ["Create new", "Search all"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: EmptySuggestPaletteProps) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const q = query.trim();
  const hits = options.filter((o) => !q || o.toLowerCase().includes(q.toLowerCase()));
  // 빗나간 검색은 안내 한 줄로 끝내지 않는다 — 친 글자를 그대로 담은 실행 가능한 줄을 대신 세운다
  const empty = q.length > 0 && hits.length === 0;
  const rows = empty ? suggestions : hits;

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
          aria-controls="es-list"
          aria-activedescendant={at >= 0 ? `es-o${at}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e: ChangeEvt) => { setQuery(e.target.value); setAt(-1); }}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), rows.length - 1)));
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              setPicked(rows[at]);
            } else if (e.key === "Escape") {
              setQuery(""); setAt(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={styles.box}>
        {empty ? <p className={styles.note}>{emptyText}</p> : null}
        <div className={styles.list} id="es-list" role="listbox" aria-label="Command palette">
          {rows.map((label, i) => (
            <div
              key={label}
              id={`es-o${i}`}
              className={`${styles.opt} ${empty ? styles.isSug : ""} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={label === picked}
              tabIndex={-1}
              onMouseMove={() => setAt(i)}
              onClick={() => setPicked(label)}
            >
              {empty ? (
                <>
                  <span className={styles.ic} aria-hidden="true">
                    <svg viewBox="0 0 256 256" width="13" height="13">
                      <g fill="currentColor">
                        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                        <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m48-88a8 8 0 0 1-8 8h-32v32a8 8 0 0 1-16 0v-32H88a8 8 0 0 1 0-16h32V88a8 8 0 0 1 16 0v32h32a8 8 0 0 1 8 8" />
                      </g>
                    </svg>
                  </span>
                  <span className={styles.act}>{label}</span>
                  <span className={styles.q}>{q}</span>
                </>
              ) : label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
