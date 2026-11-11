import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HighlightRail.module.scss";

export type HighlightRailProps = {
  label?: string;
  options?: string[];
  hint?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const ROW = 28;

export default function HighlightRail({
  label = "Sort by",
  options = ["Newest", "Most popular", "Price: low to high", "Price: high to low"],
  hint = "↑ ↓ Home End",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: HighlightRailProps) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function move(i: number) {
    setAt(Math.max(0, Math.min(i, options.length - 1)));
  }

  return (
    <div className={styles.kb} style={vars}>
      <span className={styles.label} id="kb-label">{label}</span>
      <div className={styles.panel}>
        <div
          className={styles.rail}
          aria-hidden="true"
          style={{ transform: `translateY(${at * ROW}px)` }}
        />
        <ul
          ref={listRef}
          id="kb-list"
          className={styles.list}
          role="listbox"
          aria-labelledby="kb-label"
          aria-activedescendant={`kb-o${at}`}
          tabIndex={0}
          onKeyDown={(e: KeyEvt) => {
            if (e.key === "ArrowDown") { move(at + 1); e.preventDefault(); }
            else if (e.key === "ArrowUp") { move(at - 1); e.preventDefault(); }
            else if (e.key === "Home") { move(0); e.preventDefault(); }
            else if (e.key === "End") { move(options.length - 1); e.preventDefault(); }
            else if (e.key === "Enter" || e.key === " ") { setPicked(at); e.preventDefault(); }
          }}
        >
          {options.map((o, i) => (
            <li
              key={o}
              id={`kb-o${i}`}
              className={`${styles.opt} ${i === at ? styles.isAt : ""} ${i === picked ? styles.isSel : ""}`}
              role="option"
              aria-selected={i === picked}
              onClick={() => {
                move(i);
                setPicked(i);
                listRef.current?.focus({ preventScroll: true });
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      </div>
      <span className={styles.hint}>{hint}</span>
    </div>
  );
}
