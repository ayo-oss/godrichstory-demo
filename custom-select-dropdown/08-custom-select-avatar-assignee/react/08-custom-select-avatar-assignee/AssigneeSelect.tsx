import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./AssigneeSelect.module.scss";

export type Assignee = {
  initials: string;
  name: string;
  status: "online" | "away" | "offline";
};

export type AssigneeSelectProps = {
  label?: string;
  emptyText?: string;
  people?: Assignee[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };
type ChangeEvt = { target: { value: string } };
type ClickEvt = { stopPropagation: () => void };

const DEFAULT_PEOPLE: Assignee[] = [
  { initials: "HK", name: "Hana Kim", status: "online" },
  { initials: "PP", name: "Peter Park", status: "away" },
  { initials: "LL", name: "Leo Lee", status: "offline" },
];

const TONES = [styles.picA, styles.picB, styles.picC];
const STATUS_TEXT: Record<Assignee["status"], string> = {
  online: "Online",
  away: "Away",
  offline: "Offline",
};
const STATUS_CLASS: Record<Assignee["status"], string> = {
  online: styles.dotOn,
  away: styles.dotAway,
  offline: "",
};

export default function AssigneeSelect({
  label = "Assignee",
  emptyText = "Unassigned",
  people = DEFAULT_PEOPLE,
  duration = 180,
  easing = "cubic-bezier(.34,1.56,.64,1)",
  color = "#2f6df6",
}: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const current = picked === null ? null : people[picked];

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
    <div className={`${styles.av} ${open ? styles.isOpen : ""}`} style={vars} ref={rootRef}>
      <span className={styles.label} id="av-label">{label}</span>
      <button
        ref={btnRef}
        type="button"
        id="av-btn"
        className={styles.btn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="av-list"
        aria-labelledby="av-label av-name"
        onClick={() => setOpen((o) => !o)}
      >
        {current === null ? (
          <span className={styles.empty}>
            <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
              <g fill="currentColor">
                <path d="M192 96a64 64 0 1 1-64-64a64 64 0 0 1 64 64" opacity=".2" />
                <path d="M230.92 212c-15.23-26.33-38.7-45.21-66.09-54.16a72 72 0 1 0-73.66 0c-27.39 8.94-50.86 27.82-66.09 54.16a8 8 0 1 0 13.85 8c18.84-32.56 52.14-52 89.07-52s70.23 19.44 89.07 52a8 8 0 1 0 13.85-8M72 96a56 56 0 1 1 56 56a56.06 56.06 0 0 1-56-56" />
              </g>
            </svg>
          </span>
        ) : (
          <span className={`${styles.pic} ${TONES[(picked ?? 0) % TONES.length]}`}>{current.initials}</span>
        )}
        <span className={styles.name} id="av-name">{current === null ? emptyText : current.name}</span>
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
        id="av-list"
        className={styles.list}
        role="listbox"
        aria-labelledby="av-label"
        aria-activedescendant={`av-o${active}`}
        tabIndex={-1}
        onKeyDown={(e: KeyEvt) => {
          if (e.key === "ArrowDown") { setActive((a) => Math.min(a + 1, people.length - 1)); e.preventDefault(); }
          else if (e.key === "ArrowUp") { setActive((a) => Math.max(a - 1, 0)); e.preventDefault(); }
          else if (e.key === "Enter" || e.key === " ") { pick(active); e.preventDefault(); }
          else if (e.key === "Escape") { setOpen(false); btnRef.current?.focus({ preventScroll: true }); }
        }}
      >
        {people.map((p, i) => (
          <li
            key={p.name}
            id={`av-o${i}`}
            className={`${styles.opt} ${i === active ? styles.isAt : ""} ${i === picked ? styles.isPicked : ""}`}
            role="option"
            aria-selected={i === picked}
            onMouseMove={() => setActive(i)}
            onClick={() => pick(i)}
          >
            <span className={`${styles.pic} ${TONES[i % TONES.length]}`}>{p.initials}</span>
            <span className={styles.who}>{p.name}</span>
            <span className={`${styles.dot} ${STATUS_CLASS[p.status]}`} title={STATUS_TEXT[p.status]} />
          </li>
        ))}
      </ul>
    </div>
  );
}
