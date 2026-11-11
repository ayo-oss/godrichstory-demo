import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NoResultsCard.module.scss";

export type NoResultsCardProps = {
  label?: string;
  rows?: string[];
  initialQuery?: string;
  none?: string;
  noneFor?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

export default function NoResultsCard({
  label = "Search docs",
  rows = ["Shipping policy", "Exchange guide", "Payment methods"],
  initialQuery = "return policy",
  none = "No documents found",
  noneFor = "No documents found for {q}",
  duration = 2000,
  easing = "ease-in-out",
  color = "#17141a",
}: NoResultsCardProps) {
  const [q, setQ] = useState(initialQuery);
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const term = q.trim();
  const hits = rows.filter((r) => !term || r.toLowerCase().indexOf(term.toLowerCase()) >= 0);

  function onInput(e: ChangeEvt) {
    setLoop(false);
    setQ(e.target.value);
  }

  return (
    <section className={`${styles.sw} ${loop ? styles.isDemo : ""}`} style={vars}>
      <label className={styles.label} htmlFor="sw-q">{label}</label>
      <input className={styles.input} id="sw-q" type="search" value={q} onChange={onInput} autoComplete="off" />
      <div className={styles.panel}>
        <ul className={styles.rows}>
          {hits.map((r) => <li className={styles.row} key={r}>{r}</li>)}
        </ul>
        {hits.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.lens} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="1em" height="1em">
                <g fill="currentColor">
                  <path d="M192 112a80 80 0 1 1-80-80a80 80 0 0 1 80 80" opacity=".2" />
                  <path d="m229.66 218.34l-50.06-50.06a88.21 88.21 0 1 0-11.32 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32M40 112a72 72 0 1 1 72 72a72.08 72.08 0 0 1-72-72" />
                </g>
              </svg>
            </span>
            <p className={styles.msg} aria-live="polite">{term ? noneFor.replace("{q}", term) : none}</p>
          </div>
        )}
      </div>
    </section>
  );
}
