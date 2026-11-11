import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SearchCombobox.module.scss";

export type SearchComboboxProps = {
  label?: string;
  placeholder?: string;
  emptyText?: string;
  options?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

type Slice = { before: string; hit: string; after: string };

function split(name: string, q: string): Slice {
  if (!q) return { before: name, hit: "", after: "" };
  const k = name.toLowerCase().indexOf(q.toLowerCase());
  if (k < 0) return { before: name, hit: "", after: "" };
  return { before: name.slice(0, k), hit: name.slice(k, k + q.length), after: name.slice(k + q.length) };
}

export default function SearchCombobox({
  label = "City",
  placeholder = "Search city",
  emptyText = "No results",
  options = ["Seoul", "Busan", "Daegu", "Daejeon"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SearchComboboxProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [at, setAt] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const visible = options
    .map((name, i) => ({ name, i }))
    .filter(({ name }) => !filter || name.toLowerCase().includes(filter.toLowerCase()));

  function choose(name: string) {
    setPicked(name);
    setQuery(name);
    setFilter("");
    setAt(-1);
  }

  return (
    <div className={styles.cb} style={vars}>
      <span className={styles.label} id="cb-label">{label}</span>
      <div className={styles.field}>
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
          id="cb-input"
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="cb-list"
          aria-autocomplete="list"
          aria-labelledby="cb-label"
          aria-activedescendant={at >= 0 && visible[at] ? `cb-o${visible[at].i}` : undefined}
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e: ChangeEvt) => {
            const q = e.target.value;
            setQuery(q);
            setFilter(q.trim());
            setAt(-1);
          }}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), visible.length - 1)));
              e.preventDefault();
            } else if (e.key === "Enter" && visible[at]) {
              choose(visible[at].name);
              e.preventDefault();
            } else if (e.key === "Escape") {
              setQuery("");
              setFilter("");
              setAt(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={styles.box}>
        <ul id="cb-list" className={styles.list} role="listbox" aria-labelledby="cb-label">
          {visible.map(({ name, i }, vi) => {
            const s = split(name, filter);
            return (
              <li
                key={name}
                id={`cb-o${i}`}
                className={`${styles.opt} ${vi === at ? styles.isAt : ""}`}
                role="option"
                aria-selected={name === picked}
                onMouseMove={() => setAt(vi)}
                onClick={() => choose(name)}
              >
                {s.before}
                {s.hit ? <mark className={styles.mark}>{s.hit}</mark> : null}
                {s.after}
              </li>
            );
          })}
        </ul>
        {visible.length === 0 ? <p className={styles.empty} id="cb-empty">{emptyText}</p> : null}
      </div>
    </div>
  );
}
