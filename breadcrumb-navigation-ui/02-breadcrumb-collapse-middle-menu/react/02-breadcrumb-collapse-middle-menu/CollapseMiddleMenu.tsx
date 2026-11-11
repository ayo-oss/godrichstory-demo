import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CollapseMiddleMenu.module.scss";

export type CollapseMiddleMenuProps = {
  head?: string;
  hidden?: string[];
  tail?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const IconDots = () => (
  <svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><g fill="currentColor"><path d="M240 96v64a16 16 0 0 1-16 16H32a16 16 0 0 1-16-16V96a16 16 0 0 1 16-16h192a16 16 0 0 1 16 16" opacity=".2"/><path d="M140 128a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m-136 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12"/></g></svg>
);
const IconFolder = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true"><g fill="currentColor"><path d="M128 80H32V56a8 8 0 0 1 8-8h52.69a8 8 0 0 1 5.65 2.34Z" opacity=".2"/><path d="M216 72h-84.69L104 44.69A15.86 15.86 0 0 0 92.69 40H40a16 16 0 0 0-16 16v144.62A15.4 15.4 0 0 0 39.38 216h177.51A15.13 15.13 0 0 0 232 200.89V88a16 16 0 0 0-16-16M92.69 56l16 16H40V56ZM216 200H40V88h176Z"/></g></svg>
);

export default function CollapseMiddleMenu({
  head = "Home",
  hidden = ["Electronics", "Computers"],
  tail = ["Laptops", "13-inch gaming"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CollapseMiddleMenuProps) {
  const [open, setOpen] = useState(false);
  const slotRef = useRef<HTMLLIElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event) => {
      const el = slotRef.current;
      if (el && e.target && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  function step(dir: number) {
    const el = slotRef.current;
    if (!el) return;
    const links = Array.from(el.querySelectorAll("a"));
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    links[(i + dir + links.length) % links.length].focus({ preventScroll: true });
  }

  function onKey(e: KeyEvt) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus({ preventScroll: true });
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) setOpen(true);
    else step(e.key === "ArrowDown" ? 1 : -1);
  }

  return (
    <div className={styles.cm} style={vars} onKeyDown={onKey}>
      <nav aria-label="Breadcrumb">
        <ol className={styles.list}>
          <li><a href="#">{head}</a></li>
          <li ref={slotRef} className={[styles.slot, open ? styles.isOpen : ""].join(" ")}>
            <button
              ref={btnRef}
              type="button"
              className={styles.dots}
              aria-expanded={open}
              aria-controls="cm-menu"
              aria-label="Show hidden steps"
              onClick={(): void => setOpen(!open)}
            >
              <IconDots />
            </button>
            <ul className={styles.menu} id="cm-menu">
              {hidden.map((label) => (
                <li key={label}><a href="#"><IconFolder />{label}</a></li>
              ))}
            </ul>
          </li>
          {tail.map((label, i) => (
            <li key={label}>
              {i === tail.length - 1
                ? <span className={styles.cur} aria-current="page">{label}</span>
                : <a href="#">{label}</a>}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
