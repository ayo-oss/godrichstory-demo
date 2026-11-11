import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import styles from "./ComboboxSearchSelectListbox.module.scss";

export type ComboboxSearchSelectListboxProps = {
  options?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

const DEFAULT_OPTIONS = ["South Korea", "Japan", "United States", "Canada", "France", "Germany", "Vietnam", "Thailand", "Australia", "United Kingdom"];

export default function ComboboxSearchSelectListbox({
  options = DEFAULT_OPTIONS,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: ComboboxSearchSelectListboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  const shown = useMemo(
    () => options.filter((c) => !query || c.toLowerCase().startsWith(query.toLowerCase())).slice(0, 4),
    [options, query]
  );

  function choose(i: number) {
    setQuery(shown[i]); setOpen(false);
  }

  return (
    <div className={styles.cb} style={vars} data-open={open}>
      <label className={styles.srOnly} htmlFor="cb-country-input">Search country</label>
      <input
        id="cb-country-input"
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="cb-country-list"
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Search country"
        value={query}
        onChange={(e: any) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e: any) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(shown.length - 1, a + 1)); setOpen(true); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
          else if (e.key === "Enter" && shown[active]) { e.preventDefault(); choose(active); }
          else if (e.key === "Escape") setOpen(false);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      <ul className={styles.list} id="cb-country-list" role="listbox" aria-label="Country list">
        {shown.map((c, i) => (
          <li key={c} role="option" aria-selected={i === active} data-active={i === active}
            className={styles.opt} onMouseDown={() => choose(i)}>
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
