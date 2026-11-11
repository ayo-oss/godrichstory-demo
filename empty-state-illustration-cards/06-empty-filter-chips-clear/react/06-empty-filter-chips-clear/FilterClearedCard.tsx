import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FilterClearedCard.module.scss";

export type FilterClearedCardProps = {
  filters?: string[];
  rows?: string[];
  removeLabel?: string;
  fmt?: string;
  clearLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FilterClearedCard({
  filters = ["Free shipping", "Under 50,000 KRW", "Ships today"],
  rows = ["Candle holder", "Linen curtain", "Wooden tray"],
  removeLabel = "Remove filter",
  fmt = "{n} filters · 0 items match",
  clearLabel = "Clear filters",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
}: FilterClearedCardProps) {
  const [on, setOn] = useState(filters.map(() => true));
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const left = on.filter(Boolean).length;

  function drop(i: number) {
    setLoop(false);
    setOn(on.map((v, k) => (k === i ? false : v)));
  }

  return (
    <section className={`${styles.fc} ${loop ? styles.isDemo : ""}`} style={vars}>
      <ul className={styles.chips}>
        {filters.map((f, i) => on[i] && (
          <li key={f}>
            <button className={styles.chip} type="button" onClick={() => drop(i)}>
              {f}
              <span className={styles.x} aria-hidden="true">×</span>
              <span className={styles.sr}>{removeLabel}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.panel}>
        {left === 0 ? (
          <ul className={styles.rows}>
            {rows.map((r) => <li className={styles.row} key={r}>{r}</li>)}
          </ul>
        ) : (
          <div className={styles.empty}>
            <span className={styles.icon} aria-hidden="true">
              <svg viewBox="0 0 256 256" width="1em" height="1em">
                <g fill="currentColor">
                  <path d="M221.9 61.38L152 136v58.65a8 8 0 0 1-3.56 6.66l-32 21.33A8 8 0 0 1 104 216v-80L34.1 61.38A8 8 0 0 1 40 48h176a8 8 0 0 1 5.9 13.38" opacity=".2" />
                  <path d="M230.6 49.53A15.81 15.81 0 0 0 216 40H40a16 16 0 0 0-11.81 26.76l.08.09L96 139.17V216a16 16 0 0 0 24.87 13.32l32-21.34a16 16 0 0 0 7.13-13.32v-55.49l67.74-72.32l.08-.09a15.8 15.8 0 0 0 2.78-17.23m-84.42 81.05A8 8 0 0 0 144 136v58.66L112 216v-80a8 8 0 0 0-2.16-5.47L40 56h176Z" />
                </g>
              </svg>
            </span>
            <p className={styles.msg} aria-live="polite">{fmt.replace("{n}", String(left))}</p>
            <button
              className={styles.clear}
              type="button"
              onClick={() => { setLoop(false); setOn(filters.map(() => false)); }}
            >
              {clearLabel}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
