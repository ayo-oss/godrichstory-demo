import { useState, useRef } from "react";
import type { CSSProperties } from "react";
import styles from "./FilenameWindowHeader.module.scss";

export type FilenameWindowHeaderProps = {
  filenames?: [string, string];
  tabsLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };
type Box<T> = { current: T | null };

const FileCodeIcon = () => (
  <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
    <g fill="currentColor">
      <path d="M208 88h-56V32Z" opacity=".2" />
      <path d="M181.66 146.34a8 8 0 0 1 0 11.32l-24 24a8 8 0 0 1-11.32-11.32L164.69 152l-18.35-18.34a8 8 0 0 1 11.32-11.32Zm-72-24a8 8 0 0 0-11.32 0l-24 24a8 8 0 0 0 0 11.32l24 24a8 8 0 0 0 11.32-11.32L91.31 152l18.35-18.34a8 8 0 0 0 0-11.32M216 88v128a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V40a16 16 0 0 1 16-16h96a8 8 0 0 1 5.66 2.34l56 56A8 8 0 0 1 216 88m-56-8h28.69L160 51.31Zm40 136V96h-48a8 8 0 0 1-8-8V40H56v176z" />
    </g>
  </svg>
);

const HtmlCode = () => (
  <>
    <span className={styles.c}>&lt;</span><span className={styles.k}>section</span> class=<span className={styles.s}>&quot;card&quot;</span><span className={styles.c}>&gt;</span>
    {"\n  "}<span className={styles.c}>&lt;</span><span className={styles.k}>h2</span><span className={styles.c}>&gt;</span>Hello<span className={styles.c}>&lt;/</span><span className={styles.k}>h2</span><span className={styles.c}>&gt;</span>
    {"\n  "}<span className={styles.c}>&lt;</span><span className={styles.k}>p</span><span className={styles.c}>&gt;</span>Ship it.<span className={styles.c}>&lt;/</span><span className={styles.k}>p</span><span className={styles.c}>&gt;</span>
    {"\n  "}<span className={styles.c}>&lt;</span><span className={styles.k}>button</span><span className={styles.c}>&gt;</span>Go<span className={styles.c}>&lt;/</span><span className={styles.k}>button</span><span className={styles.c}>&gt;</span>
    {"\n"}<span className={styles.c}>&lt;/</span><span className={styles.k}>section</span><span className={styles.c}>&gt;</span>
  </>
);

const CssCode = () => (
  <>
    <span className={styles.k}>.card</span> <span className={styles.c}>{"{"}</span>
    {"\n  "}padding: <span className={styles.n}>16px</span><span className={styles.c}>;</span>
    {"\n  "}border-radius: <span className={styles.n}>12px</span><span className={styles.c}>;</span>
    {"\n  "}box-shadow: <span className={styles.n}>0 2px 8px</span><span className={styles.c}>;</span>
    {"\n"}<span className={styles.c}>{"}"}</span>
  </>
);

export default function FilenameWindowHeader({
  filenames = ["index.html", "style.css"],
  tabsLabel = "Files",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FilenameWindowHeaderProps) {
  const [live, setLive] = useState(demo);
  const [active, setActive] = useState(0);
  const tab1Ref = useRef<HTMLButtonElement>(null) as Box<HTMLButtonElement>;
  const tab2Ref = useRef<HTMLButtonElement>(null) as Box<HTMLButtonElement>;
  const tabRefs: Box<HTMLButtonElement>[] = [tab1Ref, tab2Ref];

  function select(i: number) {
    setLive(false);
    setActive(i);
  }

  function onTabKeyDown(e: KeyEvt, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabRefs.length) % tabRefs.length;
    select(next);
    const el = tabRefs[next].current;
    if (el) el.focus({ preventScroll: true });
  }

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const rootClass = [styles.root, live ? styles.isDemo : ""].join(" ");

  return (
    <div className={rootClass} style={vars}>
      <div className={styles.head}>
        <span className={styles.dots} aria-hidden="true">
          <span className={[styles.dot, styles.dot1].join(" ")} />
          <span className={[styles.dot, styles.dot2].join(" ")} />
          <span className={[styles.dot, styles.dot3].join(" ")} />
        </span>
        <span className={styles.title}>
          <span className={styles.icon} aria-hidden="true"><FileCodeIcon /></span>
          <span className={styles.filenameSlot}>
            <span className={styles.filename} id="fw-react-title">{filenames[active]}</span>
            <span className={[styles.filenameDemo, styles.filenameDemo1].join(" ")} aria-hidden="true">{filenames[0]}</span>
            <span className={[styles.filenameDemo, styles.filenameDemo2].join(" ")} aria-hidden="true">{filenames[1]}</span>
          </span>
        </span>
      </div>
      <div className={styles.tabs} role="tablist" aria-label={tabsLabel}>
        <span className={styles.ptr} aria-hidden="true" />
        {filenames.map((name, i) => (
          <button
            key={name}
            ref={tabRefs[i]}
            className={[styles.tab, i === 0 ? styles.tab1 : styles.tab2].join(" ")}
            type="button"
            role="tab"
            aria-selected={live ? undefined : active === i}
            aria-controls={`fw-react-panel${i}`}
            tabIndex={live ? -1 : active === i ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={(e: KeyEvt) => onTabKeyDown(e, i)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className={styles.body}>
        <pre
          className={[styles.panel, styles.panel1, !live && active === 0 ? styles.isActive : ""].join(" ")}
          id="fw-react-panel0"
          role="tabpanel"
          aria-hidden={live ? undefined : active !== 0}
        >
          <code><HtmlCode /></code>
        </pre>
        <pre
          className={[styles.panel, styles.panel2, !live && active === 1 ? styles.isActive : ""].join(" ")}
          id="fw-react-panel1"
          role="tabpanel"
          aria-hidden={live ? undefined : active !== 1}
        >
          <code><CssCode /></code>
        </pre>
      </div>
    </div>
  );
}
