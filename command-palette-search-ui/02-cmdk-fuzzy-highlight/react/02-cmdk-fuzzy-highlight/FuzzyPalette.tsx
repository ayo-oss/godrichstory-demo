import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FuzzyPalette.module.scss";

export type FuzzyPaletteProps = {
  placeholder?: string;
  options?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

// 부분 수열 매칭 — 글자를 건너뛰어 쳐도 순서만 맞으면 걸린다. 맞은 자리를 그대로 돌려준다
export function fuzzy(name: string, query: string): number[] | null {
  if (!query) return [];
  const hay = name.toLowerCase();
  const need = query.toLowerCase();
  const hit: number[] = [];
  let from = 0;
  for (let c = 0; c < need.length; c++) {
    const k = hay.indexOf(need[c], from);
    if (k < 0) return null;
    hit.push(k);
    from = k + 1;
  }
  return hit;
}

function parts(name: string, hit: number[]) {
  const out: { text: string; on: boolean }[] = [];
  let last = 0;
  hit.forEach((k) => {
    if (k > last) out.push({ text: name.slice(last, k), on: false });
    out.push({ text: name[k], on: true });
    last = k + 1;
  });
  if (last < name.length) out.push({ text: name.slice(last), on: false });
  return out;
}

export default function FuzzyPalette({
  placeholder = "Search commands",
  options = ["Add comment", "Open settings", "New document", "New window"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FuzzyPaletteProps) {
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const visible = options
    .map((name, i) => ({ name, i, hit: fuzzy(name, query.trim()) }))
    .filter((row) => row.hit !== null);

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
          aria-controls="fz-list"
          aria-activedescendant={at >= 0 && visible[at] ? `fz-o${visible[at].i}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          value={query}
          onChange={(e: ChangeEvt) => { setQuery(e.target.value); setAt(-1); }}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), visible.length - 1)));
            } else if (e.key === "Enter" && visible[at]) {
              e.preventDefault();
              setPicked(visible[at].name);
            } else if (e.key === "Escape") {
              setQuery(""); setAt(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
      </div>
      <div className={styles.box}>
        <div className={styles.list} id="fz-list" role="listbox" aria-label="Command palette">
          {visible.map((row, vi) => (
            <div
              key={row.name}
              id={`fz-o${row.i}`}
              className={`${styles.opt} ${vi === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={row.name === picked}
              tabIndex={-1}
              onMouseMove={() => setAt(vi)}
              onClick={() => setPicked(row.name)}
            >
              <span className={styles.name}>
                {parts(row.name, row.hit ?? []).map((p, pi) =>
                  p.on ? <mark className={styles.mark} key={pi}>{p.text}</mark> : <span key={pi}>{p.text}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
