import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SocialMentionRoll.module.scss";

export type SocialMentionRollProps = {
  heading?: string;
  groupLabel?: string;
  liveLabel?: string;
  moreLabel?: string;
  nowLabel?: string;
  cards?: { key: string; handle: string; text: string; tm: string }[];
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

function AtIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
        <path d="M128 24a104 104 0 0 0 0 208c21.51 0 44.1-6.48 60.43-17.33a8 8 0 0 0-8.86-13.33C166 210.38 146.21 216 128 216a88 88 0 1 1 88-88c0 26.45-10.88 32-20 32s-20-5.55-20-32V88a8 8 0 0 0-16 0v4.26a48 48 0 1 0 5.93 65.1c6 12 16.35 18.64 30.07 18.64c22.54 0 36-17.94 36-48A104.11 104.11 0 0 0 128 24m0 136a32 32 0 1 1 32-32a32 32 0 0 1-32 32" />
      </g>
    </svg>
  );
}

const DEFAULT_CARDS = [
  { key: "m1", handle: "@yuna.builds", text: "Can I copy this checkout screen as is", tm: "2m ago" },
  { key: "m2", handle: "@minho.dev", text: "This waiting-for-reply widget is really pretty", tm: "9m ago" },
];

export default function SocialMentionRoll({
  heading = "Live mentions",
  groupLabel = "Live mentions",
  liveLabel = "live",
  moreLabel = "Fetch mentions",
  nowLabel = "now",
  cards = DEFAULT_CARDS,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SocialMentionRollProps) {
  const [live, setLive] = useState(demo);
  const [rows, setRows] = useState(cards);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function more() {
    setLive(false);
    setRows((r) => [{ key: String(Date.now()), handle: "@dali.works", text: "Saved your activity feed article", tm: nowLabel }, ...r]);
  }

  const cls = [styles.mn, live ? styles.isDemo : ""].filter(Boolean).join(" ");

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.ic} aria-hidden="true"><AtIcon /></span>
        <h2 className={styles.t}>{heading}</h2>
        <span className={styles.liveTag}>
          <span className={styles.pdot} aria-hidden="true"></span>
          {liveLabel}
        </span>
      </header>
      <ul className={styles.list} role="log" aria-live="polite">
        <li className={styles.rowNew}>
          <div className={styles.fold}>
            <div className={styles.card}>
              <p className={styles.txt}>Put it in the sidebar and the team got it right away</p>
              <p className={styles.who}>@sora.codes <time className={styles.tm}>{nowLabel}</time></p>
            </div>
          </div>
        </li>
        {rows.map((r, i) => (
          <li key={r.key} className={[styles.row, i === 0 ? styles.row1 : "", i === rows.length - 1 ? styles.rowOld : ""].filter(Boolean).join(" ")}>
            <div className={styles.fold}>
              <div className={i === 0 ? styles.cardIn : styles.card}>
                <p className={styles.txt}>{r.text}</p>
                <p className={styles.who}>{r.handle} <time className={styles.tm}>{r.tm}</time></p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button className={styles.more} type="button" onClick={more}>{moreLabel}</button>
    </section>
  );
}
