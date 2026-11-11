import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SiblingPreview.module.scss";

export type SiblingPreviewProps = {
  siblings?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type ClickEvt = { preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CaretRight = () => (
  <span className={styles.sep} aria-hidden="true"><svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg></span>
);
const CaretDown = () => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m208 96l-80 80l-80-80Z" opacity=".2"/><path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z"/></g></svg>
);

export default function SiblingPreview({
  siblings = ["Appliances", "Audio", "Cameras"],
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SiblingPreviewProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Electronics");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function links(): HTMLElement[] {
    const m = menuRef.current;
    if (!m) return [];
    return Array.prototype.slice.call(m.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
  }
  function focusAt(i: number): void {
    const l = links();
    if (!l.length) return;
    l[((i % l.length) + l.length) % l.length].focus({ preventScroll: true });
  }
  function onBtnKey(e: KeyEvt): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      window.setTimeout(() => focusAt(0), 0);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }
  function onMenuKey(e: KeyEvt): void {
    const l = links();
    const i = l.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      if (btnRef.current) btnRef.current.focus({ preventScroll: true });
    }
  }
  function pick(e: ClickEvt, name: string): void {
    e.preventDefault();
    setLabel(name);
    setOpen(false);
    if (btnRef.current) btnRef.current.focus({ preventScroll: true });
  }

  return (
    <nav className={styles.sp} style={vars} aria-label="Breadcrumb">
      <ol className={styles.list}>
        <li className={styles.item}>
          <a className={styles.crumb} href="#">Home</a>
          <CaretRight />
        </li>
        <li
          className={open ? `${styles.item} ${styles.hasMenu} ${styles.isOpen}` : `${styles.item} ${styles.hasMenu}`}
          onPointerEnter={(): void => setOpen(true)}
          onPointerLeave={(): void => setOpen(false)}
        >
          <button
            ref={btnRef}
            type="button"
            className={`${styles.crumb} ${styles.crumbBtn}`}
            aria-haspopup="menu"
            aria-expanded={open}
            onKeyDown={onBtnKey}
            onClick={(): void => setOpen(!open)}
          >
            <span>{label}</span>
            <CaretDown />
          </button>
          <ul
            ref={menuRef}
            className={styles.menu}
            role="menu"
            aria-label="Categories beside Electronics"
            onKeyDown={onMenuKey}
          >
            {siblings.map((s: string) => (
              <li className={styles.opt} role="none" key={s}>
                <a className={styles.mlink} role="menuitem" tabIndex={-1} href="#" onClick={(e: ClickEvt): void => pick(e, s)}>{s}</a>
              </li>
            ))}
          </ul>
          <CaretRight />
        </li>
        <li className={styles.item}>
          <a className={styles.crumb} href="#">Laptops</a>
          <CaretRight />
        </li>
        <li className={styles.item}>
          <span className={`${styles.crumb} ${styles.now}`} aria-current="page">13-inch gaming</span>
        </li>
      </ol>
    </nav>
  );
}
