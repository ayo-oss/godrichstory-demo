import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ChangeHistoryDiff.module.scss";

export type ChangeHistoryDiffProps = {
  heading?: string;
  groupLabel?: string;
  undoLabel?: string;
  revertedTag?: string;
  liveHint?: string;
  restoredMsg?: string;
  editedAgainMsg?: string;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Field = { key: string; f: string; oldV: string; newV: string };

const FIELDS: Field[] = [
  { key: "due", f: "Due date", oldV: "Oct 15", newV: "Oct 8" },
  { key: "owner", f: "Owner", oldV: "Lee Jun", newV: "Park Seo-a" },
  { key: "qty", f: "Qty", oldV: "120", newV: "150" },
];

function UndoIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
        <path d="M224 128a96 96 0 0 1-94.71 96H128a95.38 95.38 0 0 1-65.9-26.2a8 8 0 0 1 11-11.63a80 80 0 1 0-1.67-114.78a3 3 0 0 1-.26.25L44.59 96H72a8 8 0 0 1 0 16H24a8 8 0 0 1-8-8V56a8 8 0 0 1 16 0v29.8L60.25 60A96 96 0 0 1 224 128" />
      </g>
    </svg>
  );
}

export default function ChangeHistoryDiff({
  heading = "Change history",
  groupLabel = "Quote change history",
  undoLabel = "Undo",
  revertedTag = "Reverted",
  liveHint = "Undoing an item reports here",
  restoredMsg = " was restored to the previous value",
  editedAgainMsg = " was edited again",
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ChangeHistoryDiffProps) {
  const [live, setLive] = useState(demo);
  const [back, setBack] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState(liveHint);

  const left = FIELDS.filter((x) => !back[x.key]).length;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function undo(k: string, f: string) {
    setLive(false);
    const nextVal = !back[k];
    setBack({ ...back, [k]: nextVal });
    setMsg(nextVal ? f + restoredMsg : f + editedAgainMsg);
  }

  const cls = [styles.dh, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.ic} aria-hidden="true"><UndoIcon /></span>
        <h2 className={styles.t}>{heading}</h2>
        <span className={styles.n} aria-live="polite">
          {left} edited
        </span>
      </header>
      <ul className={styles.list}>
        {FIELDS.map((x, i) => (
          <li key={x.key} className={[styles.row, i + 1 <= 2 ? styles[`r${i + 1}`] : "", back[x.key] ? styles.isBack : ""].filter(Boolean).join(" ")}>
            <span className={styles.f}>{x.f}</span>
            <p className={styles.diff}>
              <span className={styles.a}>
                <del>{x.oldV}</del> → <ins>{x.newV}</ins>
              </span>
              <span className={styles.b}>
                <b>{x.oldV}</b>
                <i className={styles.tag}>{revertedTag}</i>
              </span>
            </p>
            <button className={styles.undoBtn} type="button" aria-pressed={!!back[x.key]} onClick={() => undo(x.key, x.f)}>
              <span className={styles.u} aria-hidden="true"><UndoIcon /></span>
              {undoLabel}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.live} aria-live="polite">{msg}</p>
    </section>
  );
}
