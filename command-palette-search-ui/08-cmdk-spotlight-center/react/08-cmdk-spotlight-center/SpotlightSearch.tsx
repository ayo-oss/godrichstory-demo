import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SpotlightSearch.module.scss";

export type SpotlightSearchProps = {
  placeholder?: string;
  results?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

export default function SpotlightSearch({
  placeholder = "Search all",
  results = ["Weekly report", "Quarterly report", "Report template"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 결과 자리는 늘 잡아 두고 위 모서리부터 잘라 보여준다 — scaleY 로 줄이면 글자까지 눌린다
  const open = query.trim().length > 0;

  return (
    <div className={styles.sp} style={vars} role="dialog" aria-modal="true" aria-label={placeholder}>
      <div className={styles.field}>
        <span className={styles.mag} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="18" height="18">
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
          aria-controls="sl-list"
          aria-activedescendant={at >= 0 ? `sl-o${at}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e: ChangeEvt) => { setQuery(e.target.value); setAt(-1); }}
          onKeyDown={(e: KeyEvt) => {
            if (!open) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), results.length - 1)));
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              setPicked(results[at]);
            } else if (e.key === "Escape") {
              setQuery(""); setAt(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={`${styles.panel} ${open ? styles.isOpen : ""}`}>
        <span className={styles.sheet} aria-hidden="true" />
        <div className={styles.rows} id="sl-list" role="listbox" aria-label="Results">
          {results.map((label, i) => (
            <div
              key={label}
              id={`sl-o${i}`}
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
