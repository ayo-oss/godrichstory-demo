import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GroupedSelect.module.scss";

export type SelectGroup = { head: string; options: string[] };

export type GroupedSelectProps = {
  label?: string;
  groups?: SelectGroup[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const DEFAULT_GROUPS: SelectGroup[] = [
  { head: "Engineering", options: ["Frontend", "Backend"] },
  { head: "Design", options: ["UI design", "Brand"] },
];

export default function GroupedSelect({
  label = "Team",
  groups = DEFAULT_GROUPS,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: GroupedSelectProps) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const optRefs = useRef<(HTMLLIElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const flat: string[] = groups.flatMap((g) => g.options);
  const offset = (gi: number) => groups.slice(0, gi).reduce((s, g) => s + g.options.length, 0);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (open) trackRef.current?.focus({ preventScroll: true });
  }, [open]);

  function pick(i: number) {
    setAt(i);
    setPicked(i);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className={`${styles.gs} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <span className={styles.label} id="gs-label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        id="gs-btn"
        className={styles.btn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="gs-list"
        aria-labelledby="gs-label gs-value"
        onClick={() => setOpen((o) => !o)}
      >
        <span id="gs-value">{flat[picked]}</span>
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
        <div className={styles.scroll} id="gs-scroll">
          <ul
            ref={trackRef}
            id="gs-list"
            className={styles.track}
            role="listbox"
            aria-labelledby="gs-label"
            aria-activedescendant={`gs-o${at}`}
            tabIndex={-1}
            onKeyDown={(e: KeyEvt) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                const next = Math.max(0, Math.min(at + (e.key === "ArrowDown" ? 1 : -1), flat.length - 1));
                setAt(next);
                optRefs.current?.[next]?.scrollIntoView({ block: "nearest" });
                e.preventDefault();
              } else if (e.key === "Enter" || e.key === " ") {
                pick(at);
                e.preventDefault();
              } else if (e.key === "Escape") {
                setOpen(false);
                btnRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            {groups.map((g, gi) => (
              <li key={g.head} className={styles.group} role="group" aria-labelledby={`gs-g${gi}`}>
                <p className={styles.head} id={`gs-g${gi}`}>{g.head}</p>
                <ul className={styles.sub} role="presentation">
                  {g.options.map((o, oi) => {
                    const i = offset(gi) + oi;
                    return (
                      <li
                        key={o}
                        ref={(el: HTMLLIElement | null) => { if (optRefs.current) optRefs.current[i] = el; }}
                        id={`gs-o${i}`}
                        className={`${styles.opt} ${i === at ? styles.isAt : ""}`}
                        role="option"
                        aria-selected={i === picked}
                        onClick={() => pick(i)}
                      >
                        {o}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
