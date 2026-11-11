import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EmptyFirstActivity.module.scss";

export type EmptyFirstActivityProps = {
  groupLabel?: string;
  heading?: string;
  emptyTitle?: string;
  emptySub?: string;
  emptyPhase?: string;
  countPhase?: (n: number) => string;
  addLabel?: string;
  clearLabel?: string;
  nowLabel?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Item = { key: number; name: string; initial: string; av: string; text: string };

const NEXT: Item[] = [
  { key: 0, name: "Park Seo-a", initial: "P", av: "#4cd4a6", text: " created the first doc" },
];

function TrayIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M216 48v112h-36.69a8 8 0 0 0-5.66 2.34l-19.31 19.32a8 8 0 0 1-5.66 2.34h-41.37a8 8 0 0 1-5.66-2.34l-19.31-19.32a8 8 0 0 0-5.66-2.34H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
        <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 16v104h-28.7a15.86 15.86 0 0 0-11.3 4.69L148.69 176h-41.38L88 156.68A15.9 15.9 0 0 0 76.69 152H48V48Zm0 160H48v-40h28.69L96 187.32a15.9 15.9 0 0 0 11.31 4.68h41.38a15.86 15.86 0 0 0 11.31-4.69L179.31 168H208z" />
      </g>
    </svg>
  );
}

export default function EmptyFirstActivity({
  groupLabel = "Activity feed",
  heading = "Activity feed",
  emptyTitle = "No activity yet",
  emptySub = "The first activity will stack up here",
  emptyPhase = "Empty",
  countPhase = (n) => `${n} activities`,
  addLabel = "New activity",
  clearLabel = "Clear",
  nowLabel = "now",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: EmptyFirstActivityProps) {
  const [live, setLive] = useState(demo);
  const [items, setItems] = useState<Item[]>([]);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function add() {
    setLive(false);
    setItems((r) => [{ ...NEXT[0], key: Date.now() }, ...r]);
  }

  function clear() {
    setLive(false);
    setItems([]);
  }

  const has = items.length > 0;
  const cls = [styles.ef, live ? styles.isDemo : "", has ? styles.hasAct : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <h2 className={styles.t}>{heading}</h2>
        <span className={styles.phase} aria-live="polite">
          {live ? (
            <>
              <i className={styles.pEmpty} aria-hidden="true">{emptyPhase}</i>
              <i className={styles.pCount} aria-hidden="true">{countPhase(2)}</i>
            </>
          ) : (
            (has ? countPhase(items.length) : emptyPhase)
          )}
        </span>
      </header>
      <div className={styles.empty}>
        <span className={styles.ic} aria-hidden="true"><TrayIcon /></span>
        <p className={styles.e1}>{emptyTitle}</p>
        <p className={styles.e2}>{emptySub}</p>
      </div>
      <ul className={styles.list} role="log" aria-live="polite">
        <li className={styles.rowFirst}>
          <div className={styles.fold}>
            <div className={styles.cell}>
              <span className={styles.av} style={{ background: color }}>K</span>
              <p className={styles.line}><b>Kim Haneul</b> joined the team</p>
              <time className={styles.tm}>{nowLabel}</time>
            </div>
          </div>
        </li>
        <li className={styles.rowSecond}>
          <div className={styles.fold}>
            <div className={styles.cell}>
              <span className={styles.av} style={{ background: "#ff9ebb" }}>L</span>
              <p className={styles.line}><b>Lee Jun</b> opened the getting-started guide</p>
              <time className={styles.tm}>{nowLabel}</time>
            </div>
          </div>
        </li>
        {items.map((it) => (
          <li key={it.key} className={styles.rowIn}>
            <div className={styles.fold}>
              <div className={styles.cell}>
                <span className={styles.av} style={{ background: it.av }}>{it.initial}</span>
                <p className={styles.line}><b>{it.name}</b>{it.text}</p>
                <time className={styles.tm}>{nowLabel}</time>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.btns}>
        <button className={styles.bMain} type="button" onClick={add}>{addLabel}</button>
        <button className={styles.b} type="button" onClick={clear}>{clearLabel}</button>
      </div>
    </section>
  );
}
