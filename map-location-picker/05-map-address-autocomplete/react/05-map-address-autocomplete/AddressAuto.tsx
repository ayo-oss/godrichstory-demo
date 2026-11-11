import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AddressAuto.module.scss";

export type AddressItem = {
  text: string;
  /** 지도 안 좌표 (예: "58%") */
  x: string;
  y: string;
};

export type AddressAutoProps = {
  placeholder?: string;
  listLabel?: string;
  items?: AddressItem[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };

const DEFAULT_ITEMS: AddressItem[] = [
  { text: "Teheran-ro 152", x: "88%", y: "30%" },
  { text: "Teheran-ro 427", x: "74%", y: "58%" },
  { text: "Teheran-ro-gil 21", x: "78%", y: "72%" },
  { text: "Teheran-ro 87-gil 36", x: "92%", y: "46%" },
];

function PinIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} aria-hidden="true">
      <g fill="currentColor">
        <path d="M128 24a80 80 0 0 0-80 80c0 72 80 128 80 128s80-56 80-128a80 80 0 0 0-80-80m0 112a32 32 0 1 1 32-32a32 32 0 0 1-32 32" opacity=".2" />
        <path d="M128 64a40 40 0 1 0 40 40a40 40 0 0 0-40-40m0 64a24 24 0 1 1 24-24a24 24 0 0 1-24 24m0-112a88.1 88.1 0 0 0-88 88c0 31.4 14.51 64.68 42 96.25a254.2 254.2 0 0 0 41.45 38.3a8 8 0 0 0 9.18 0a254.2 254.2 0 0 0 41.37-38.3c27.45-31.57 42-64.85 42-96.25a88.1 88.1 0 0 0-88-88m0 206c-16.53-13-72-60.75-72-118a72 72 0 0 1 144 0c0 57.23-55.47 105-72 118" />
      </g>
    </svg>
  );
}

export default function AddressAuto({
  placeholder = "Search an address",
  listLabel = "Address suggestions",
  items = DEFAULT_ITEMS,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: AddressAutoProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState(-1);
  const [spot, setSpot] = useState({ left: "82%", top: "38%" });
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function pick(i: number) {
    const it = items[i];
    setPicked(i);
    setQuery(it.text);
    setSpot({ left: it.x, top: it.y });
    setOpen(false);
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.ac} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <div className={styles.map}>
        <span className={styles.pin} style={spot} aria-hidden="true"><PinIcon size={20} /></span>
      </div>
      <ul className={styles.list} id="ac-list" role="listbox" aria-label={listLabel}>
        {items.map((it, i) => (
          <li
            key={it.text}
            id={`ac-o${i}`}
            className={`${styles.opt} ${i === active ? styles.isActive : ""}`}
            role="option"
            aria-selected={i === picked}
            onMouseMove={() => setActive(i)}
            onClick={() => pick(i)}
          >
            <PinIcon size={13} />
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
      <div className={styles.field}>
        <span className={styles.ico} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="14" height="14">
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
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          aria-expanded={open}
          aria-controls="ac-list"
          aria-autocomplete="list"
          aria-activedescendant={open ? `ac-o${active}` : undefined}
          onChange={(e: ChangeEvt) => { setQuery(e.target.value); setOpen(e.target.value.length > 0); }}
          onFocus={() => setOpen(query.length > 0)}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown") { setActive((a) => Math.min(a + 1, items.length - 1)); setOpen(true); e.preventDefault(); }
            else if (e.key === "ArrowUp") { setActive((a) => Math.max(a - 1, 0)); setOpen(true); e.preventDefault(); }
            else if (e.key === "Enter") { pick(active); e.preventDefault(); }
            else if (e.key === "Escape") { setOpen(false); }
          }}
        />
      </div>
    </div>
  );
}
