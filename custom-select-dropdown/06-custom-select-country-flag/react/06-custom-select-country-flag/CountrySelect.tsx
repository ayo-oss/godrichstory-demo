import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./CountrySelect.module.scss";

export type Country = {
  name: string;
  code: string;
  currency: string;
  flag: ReactNode;
};

export type CountrySelectProps = {
  label?: string;
  countries?: Country[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const FLAG_JAPAN: ReactNode = (
  <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true">
    <rect width="16" height="12" fill="#ffffff" />
    <circle cx="8" cy="6" r="3.4" fill="#bc002d" />
  </svg>
);

const FLAG_FRANCE: ReactNode = (
  <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true">
    <rect width="16" height="12" fill="#ffffff" />
    <rect width="5.33" height="12" fill="#0055a4" />
    <rect x="10.67" width="5.33" height="12" fill="#ef4135" />
  </svg>
);

const FLAG_POLAND: ReactNode = (
  <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true">
    <rect width="16" height="6" fill="#ffffff" />
    <rect y="6" width="16" height="6" fill="#dc143c" />
  </svg>
);

const FLAG_INDONESIA: ReactNode = (
  <svg viewBox="0 0 16 12" width="16" height="12" aria-hidden="true">
    <rect width="16" height="6" fill="#ce1126" />
    <rect y="6" width="16" height="6" fill="#ffffff" />
  </svg>
);

const DEFAULT_COUNTRIES: Country[] = [
  { name: "Japan", code: "JPY", currency: "JPY ¥", flag: FLAG_JAPAN },
  { name: "France", code: "EUR", currency: "EUR €", flag: FLAG_FRANCE },
  { name: "Poland", code: "PLN", currency: "PLN zł", flag: FLAG_POLAND },
  { name: "Indonesia", code: "IDR", currency: "IDR Rp", flag: FLAG_INDONESIA },
];

export default function CountrySelect({
  label = "Ship to",
  countries = DEFAULT_COUNTRIES,
  duration = 180,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const current = countries[picked];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);

  function pick(i: number) {
    setPicked(i);
    setActive(i);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.cf} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <span className={styles.label} id="cf-label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        id="cf-btn"
        className={styles.btn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="cf-list"
        aria-labelledby="cf-label cf-name"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.flag}>{current.flag}</span>
        <span className={styles.name} id="cf-name">{current.name}</span>
        <span className={styles.cur}>{current.currency}</span>
        <span className={styles.caret} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="12" height="12">
            <g fill="currentColor">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </g>
          </svg>
        </span>
      </button>
      <ul
        ref={listRef}
        id="cf-list"
        className={styles.list}
        role="listbox"
        aria-labelledby="cf-label"
        aria-activedescendant={`cf-o${active}`}
        tabIndex={-1}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown") { setActive((a) => Math.min(a + 1, countries.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter" || e.key === " ") { pick(active); e.preventDefault(); }
          else if (e.key === "Escape") { setOpen(false); btnRef.current?.focus({ preventScroll: true }); }
        }}
      >
        {countries.map((c, i) => (
          <li
            key={c.code}
            id={`cf-o${i}`}
            className={`${styles.opt} ${i === active ? styles.isAt : ""} ${i === picked ? styles.isPicked : ""}`}
            role="option"
            aria-selected={i === picked}
            onMouseMove={() => setActive(i)}
            onClick={() => pick(i)}
          >
            <span className={styles.flag}>{c.flag}</span>
            <span className={styles.optName}>{c.name}</span>
            <span className={styles.code}>{c.code}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
