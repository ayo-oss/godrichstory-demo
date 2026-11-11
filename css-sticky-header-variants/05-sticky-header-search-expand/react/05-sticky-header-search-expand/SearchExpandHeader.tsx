import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SearchExpandHeader.module.scss";

export type SearchExpandHeaderProps = {
  logo: string;
  placeholder: string;
  /** 폭이 넓어지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SearchExpandHeader({
  logo,
  placeholder,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SearchExpandHeaderProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) inputRef.current?.focus({ preventScroll: true });
    else inputRef.current?.blur();
  }

  return (
    <header className={styles.head} style={vars}>
      <span className={styles.logo}>{logo}</span>
      <div className={open ? `${styles.search} ${styles.isOpen}` : styles.search}>
        <button type="button" className={styles.toggle} aria-label="검색 열기" aria-expanded={open} onClick={toggle}>
          <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <line x1="20" y1="20" x2="15.7" y2="15.7" />
          </svg>
        </button>
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          placeholder={placeholder}
          aria-label="검색어 입력"
          tabIndex={open ? 0 : -1}
        />
      </div>
    </header>
  );
}
