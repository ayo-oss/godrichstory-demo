import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./SearchExpand.module.scss";

export type SearchExpandLabels = {
  brand: string;
  openLabel: string;
  placeholder: string;
  items: string[];
};

export type SearchExpandProps = {
  labels?: Partial<SearchExpandLabels>;
  /** 격자 미리보기용 2초 자동 루프. 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
// ambient 가 얇아 이벤트 제네릭을 못 쓴다 — 필요한 꼴만 로컬 타입으로 선언
type KeyEvt = { key: string; preventDefault(): void };
type InputEvt = { target: HTMLInputElement };
type Focusable = { focus: (o: { preventScroll: boolean }) => void };
type Box<T> = { current: T | null };

const defaults: SearchExpandLabels = {
  brand: "File depot",
  openLabel: "Open search",
  placeholder: "Search the site",
  items: ["Templates", "Icon sets", "Quick start"],
};

function MagnifyIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2"/><path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72"/></g></svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><g fill="currentColor"><path d="M192 64v104L88 64Z" opacity=".2"/><path d="M192 56H88a8 8 0 0 0-5.66 13.66L128.69 116l-70.35 70.34a8 8 0 0 0 11.32 11.32L140 127.31l46.34 46.35A8 8 0 0 0 200 168V64a8 8 0 0 0-8-8m-8 92.69l-38.34-38.34L107.31 72H184Z"/></g></svg>
  );
}

export default function SearchExpand({
  labels,
  demo = true,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: SearchExpandProps) {
  const L = { ...defaults, ...labels };
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(demo);
  const [value, setValue] = useState("");
  const btnRef = useRef<Focusable | null>(null);
  const inputRef = useRef<Focusable | null>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const q = value.trim();
  const hits = q === "" ? [] : L.items.filter((t) => t.includes(q));
  const listing = open && hits.length > 0;

  function setSearch(on: boolean) {
    setLive(false);
    setOpen(on);
    if (on) { inputRef.current?.focus({ preventScroll: true }); return; }
    btnRef.current?.focus({ preventScroll: true });
  }

  function rootKeys(e: KeyEvt) {
    if (e.key === "Escape" && open) setSearch(false);
  }

  const cls = [styles.frame, live ? styles.isDemo : "", open ? styles.isOpen : "", listing ? styles.isListing : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={vars} aria-label={L.brand} onKeyDown={rootKeys}>
      <div className={styles.page}>
        <header className={styles.bar}>
          <p className={styles.brand}>{L.brand}</p>
          <div className={styles.search}>
            <button
              className={styles.glass}
              type="button"
              aria-label={L.openLabel}
              aria-haspopup="true"
              aria-expanded={open}
              onClick={() => setSearch(!open)}
              ref={(el: Focusable | null) => { btnRef.current = el; }}
            >
              <MagnifyIcon />
            </button>
            <input
              className={styles.input}
              type="text"
              placeholder={L.placeholder}
              autoComplete="off"
              tabIndex={open ? 0 : -1}
              value={value}
              onChange={(e: InputEvt) => { setLive(false); setValue(e.target.value); }}
              ref={(el: Focusable | null) => { inputRef.current = el; }}
            />
          </div>
        </header>
        <div className={styles.body}>
          <p className={styles.skeleton} aria-hidden="true" />
          <p className={styles.skeletonShort} aria-hidden="true" />
        </div>
      </div>
      <ul className={styles.skips} aria-hidden={!listing}>
        {L.items.map((t) => (
          <li key={t} hidden={!hits.includes(t)}>
            <button type="button" onClick={() => setSearch(false)}>
              <span>{t}</span>
              <ArrowIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
