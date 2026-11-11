import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SeparatorVariants.module.scss";

export type SeparatorVariantsProps = {
  trail?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type KeyEvt = { key: string; preventDefault(): void };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

const CaretRight = () => (
  <svg viewBox="0 0 256 256" width="12" height="12" aria-hidden="true"><g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2"/><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z"/></g></svg>
);

const KINDS = ["slash", "caret", "dot"];
const LABELS = ["Slash", "Chevron", "Middle dot"];

export default function SeparatorVariants({
  trail = ["Home", "Electronics", "Laptops", "13-inch gaming"],
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SeparatorVariantsProps) {
  const [at, setAt] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": at };

  function onKey(e: KeyEvt, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setAt((i + (e.key === "ArrowRight" ? 1 : LABELS.length - 1)) % LABELS.length);
  }

  return (
    <div className={styles.sv} style={vars}>
      <nav className={styles.stack} aria-label="Breadcrumb">
        {KINDS.map((kind, n) => (
          <ol
            key={kind}
            className={[styles.list, styles[kind], n === at ? styles.on : ""].join(" ")}
            aria-hidden={n !== at}
          >
            {trail.map((label, i) => (
              <li key={label}>
                {i === trail.length - 1
                  ? <span className={styles.cur} aria-current={n === at ? "page" : undefined}>{label}</span>
                  : <a href="#" tabIndex={n === at ? 0 : -1}>{label}</a>}
                {kind === "caret" && i < trail.length - 1 && (
                  <span className={styles.sep} aria-hidden="true"><CaretRight /></span>
                )}
              </li>
            ))}
          </ol>
        ))}
      </nav>
      <div className={styles.tabs} role="group" aria-label="Separator style">
        <span className={styles.ind} aria-hidden="true" />
        {LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.pill}
            aria-pressed={i === at}
            onClick={(): void => setAt(i)}
            onKeyDown={(e: KeyEvt): void => onKey(e, i)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
