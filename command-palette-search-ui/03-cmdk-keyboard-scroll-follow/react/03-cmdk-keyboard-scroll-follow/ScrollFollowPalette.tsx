import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScrollFollowPalette.module.scss";

export type ScrollFollowPaletteProps = {
  placeholder?: string;
  options?: string[];
  rows?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const DEFAULT_OPTIONS = [
  "Create document", "Create folder", "Invite member", "Mute notifications",
  "Change theme", "Export", "Sign out",
];

export default function ScrollFollowPalette({
  placeholder = "Search commands",
  options = DEFAULT_OPTIONS,
  rows = 4,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: ScrollFollowPaletteProps) {
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]) as { current: (HTMLDivElement | null)[] };
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, height: `${rows * 24}px` };

  // block: "nearest" 라서 이미 보이는 줄이면 스크롤이 아예 일어나지 않는다 — 커서가 끝에 닿을 때만 목록이 움직인다
  function move(next: number) {
    const i = Math.max(0, Math.min(next, options.length - 1));
    setAt(i);
    rowRefs.current[i]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className={styles.pal} role="dialog" aria-modal="true" aria-label="Command palette">
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
          aria-controls="sf-list"
          aria-activedescendant={at >= 0 ? `sf-o${at}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              move(at + (e.key === "ArrowDown" ? 1 : -1));
            } else if (e.key === "Home" || e.key === "End") {
              e.preventDefault();
              move(e.key === "Home" ? 0 : options.length - 1);
            } else if (e.key === "Enter" && at >= 0) {
              e.preventDefault();
              setPicked(options[at]);
            } else if (e.key === "Escape") {
              setAt(-1);
              inputRef.current?.focus({ preventScroll: true });
            }
          }}
        />
        <kbd className={styles.kbd}>↓</kbd>
      </div>
      <div className={styles.box} style={vars}>
        <div className={styles.track} id="sf-list" role="listbox" aria-label="Command palette">
          {options.map((label, i) => (
            <div
              key={label}
              id={`sf-o${i}`}
              ref={(el: HTMLDivElement | null) => { rowRefs.current[i] = el; }}
              className={`${styles.opt} ${i === at ? styles.isAt : ""}`}
              role="option"
              aria-selected={label === picked}
              tabIndex={-1}
              onMouseMove={() => move(i)}
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
