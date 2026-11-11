import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColorSwatchSelect.module.scss";

export type Swatch = { name: string; hex: string };

export type ColorSwatchSelectProps = {
  label?: string;
  swatches?: Swatch[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const COLS = 4;
const STEP = 44;

const DEFAULT_SWATCHES: Swatch[] = [
  { name: "Coral", hex: "#ef476f" },
  { name: "Tangerine", hex: "#ff9f1c" },
  { name: "Lemon", hex: "#ffc94d" },
  { name: "Mint", hex: "#06d6a0" },
  { name: "Ocean", hex: "#118ab2" },
  { name: "Lavender", hex: "#7b61ff" },
  { name: "Blossom", hex: "#f48fb1" },
  { name: "Ink", hex: "#2b2d42" },
];

const KEY_STEP: Record<string, number | undefined> = {
  ArrowRight: 1,
  ArrowLeft: -1,
  ArrowDown: COLS,
  ArrowUp: -COLS,
};

export default function ColorSwatchSelect({
  label = "Label color",
  swatches = DEFAULT_SWATCHES,
  duration = 180,
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#2f6df6",
}: ColorSwatchSelectProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const current = swatches[picked];
  const ringStyle: CSSProperties = {
    transform: `translate(${(picked % COLS) * STEP}px, ${Math.floor(picked / COLS) * STEP}px)`,
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (open) gridRef.current?.focus({ preventScroll: true });
  }, [open]);

  function pick(i: number) {
    setPicked(Math.max(0, Math.min(i, swatches.length - 1)));
  }

  return (
    <div className={`${styles.cs} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <span className={styles.label} id="cs-label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        id="cs-btn"
        className={styles.btn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="cs-grid"
        aria-labelledby="cs-label cs-name"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.dot} style={{ background: current.hex }} />
        <span className={styles.name} id="cs-name">{current.name}</span>
        <span className={styles.caret} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="12" height="12">
            <g fill="currentColor">
              <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
              <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
            </g>
          </svg>
        </span>
      </button>
      <div className={styles.panel}>
        <span className={styles.ring} style={ringStyle} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="14" height="14">
            <g fill="#ffffff">
              <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
              <path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88" />
            </g>
          </svg>
        </span>
        <div
          ref={gridRef}
          id="cs-grid"
          className={styles.grid}
          role="listbox"
          aria-labelledby="cs-label"
          tabIndex={-1}
          onKeyDown={(e: KeyEvt) => {
            const step = KEY_STEP[e.key];
            if (step) { pick(picked + step); e.preventDefault(); }
            else if (e.key === "Escape") { setOpen(false); btnRef.current?.focus({ preventScroll: true }); }
          }}
        >
          {swatches.map((s, i) => (
            <span
              key={s.hex}
              className={styles.sw}
              role="option"
              aria-selected={i === picked}
              aria-label={s.name}
              style={{ background: s.hex }}
              onClick={() => pick(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
