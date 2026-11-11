import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MultiChipSelect.module.scss";

export type MultiChipSelectProps = {
  label?: string;
  options?: string[];
  initial?: string[];
  removeLabel?: (name: string) => string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const DEFAULT_OPTIONS = ["React", "SCSS", "Vite"];
const DEFAULT_INITIAL = ["React", "SCSS"];

function XIcon() {
  return (
    <svg viewBox="0 0 256 256" width="10" height="10">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
      </g>
    </svg>
  );
}

export default function MultiChipSelect({
  label = "Tech stack",
  options = DEFAULT_OPTIONS,
  initial = DEFAULT_INITIAL,
  removeLabel = (name: string) => `Remove ${name}`,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: MultiChipSelectProps) {
  const [open, setOpen] = useState(true);
  const [chips, setChips] = useState<string[]>(initial);
  const [at, setAt] = useState(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle(name: string) {
    setChips((cur) => (cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]));
  }

  return (
    <div className={`${styles.mc} ${open ? styles.isOpen : ""}`} style={vars}>
      <span className={styles.label} id="mc-label">{label}</span>
      <div
        ref={fieldRef}
        id="mc-field"
        className={styles.field}
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="mc-list"
        aria-labelledby="mc-label"
        aria-activedescendant={`mc-o${at}`}
        onClick={() => setOpen(true)}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "Backspace") {
            setChips((cur) => cur.slice(0, -1));
            e.preventDefault();
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            setAt((a) => Math.max(0, Math.min(a + (e.key === "ArrowDown" ? 1 : -1), options.length - 1)));
            setOpen(true);
            e.preventDefault();
          } else if (e.key === "Enter" || e.key === " ") {
            toggle(options[at]);
            e.preventDefault();
          } else if (e.key === "Escape") {
            setOpen(false);
            fieldRef.current?.blur();
          }
        }}
      >
        <span className={styles.chips} id="mc-chips">
          {chips.map((c) => (
            <span key={c} className={styles.chip}>
              {c}
              <button
                type="button"
                className={styles.x}
                aria-label={removeLabel(c)}
                onClick={(e: ClickEvt) => {
                  e.stopPropagation();
                  toggle(c);
                }}
              >
                <XIcon />
              </button>
            </span>
          ))}
        </span>
        <span className={styles.caret} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="12" height="12">
            <g fill="currentColor">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </g>
          </svg>
        </span>
      </div>
      <ul
        id="mc-list"
        className={styles.list}
        role="listbox"
        aria-multiselectable="true"
        aria-labelledby="mc-label"
      >
        {options.map((o, i) => {
          const on = chips.includes(o);
          return (
            <li
              key={o}
              id={`mc-o${i}`}
              className={`${styles.opt} ${on ? styles.isOn : ""} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={on}
              onMouseMove={() => setAt(i)}
              onClick={() => {
                setAt(i);
                toggle(o);
                fieldRef.current?.focus({ preventScroll: true });
              }}
            >
              {o}
              <span className={styles.tick} aria-hidden="true">
                <svg viewBox="0 0 256 256" width="13" height="13">
                  <g fill="currentColor">
                    <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                    <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
                  </g>
                </svg>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
