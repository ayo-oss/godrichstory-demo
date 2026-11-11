import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./NotFoundCard.module.scss";

export type NotFoundCardProps = {
  title?: string;
  path?: string[];
  action?: string;
  homeLabel?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NotFoundCard({
  title = "There is nothing here",
  path = ["Home", "Files", "?"],
  action = "Up one level",
  homeLabel = "This is home",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: NotFoundCardProps) {
  const [segs, setSegs] = useState(path);
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const atHome = segs.length <= 1;

  return (
    <section className={`${styles.nf} ${loop ? styles.isDemo : ""}`} style={vars}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 256 256" width="1em" height="1em">
          <g fill="currentColor">
            <path d="M128 32a96 96 0 1 0 96 96a96 96 0 0 0-96-96m16 112l-64 32l32-64l64-32Z" opacity=".2" />
            <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m44.42-143.16l-64 32a8.05 8.05 0 0 0-3.58 3.58l-32 64A8 8 0 0 0 80 184a8.1 8.1 0 0 0 3.58-.84l64-32a8.05 8.05 0 0 0 3.58-3.58l32-64a8 8 0 0 0-10.74-10.74M138 138l-40.11 20.11L118 118l40.15-20.07Z" />
          </g>
        </svg>
      </span>
      <h2 className={styles.title}>{title}</h2>
      <ol className={styles.path} aria-live="polite">
        {segs.map((s, i) => (
          <li className={`${styles.seg} ${i === segs.length - 1 && segs.length === path.length ? styles.isGone : ""}`} key={s}>{s}</li>
        ))}
      </ol>
      <button
        className={styles.btn}
        type="button"
        disabled={atHome}
        onClick={() => { setLoop(false); setSegs(segs.slice(0, -1)); }}
      >
        {atHome ? homeLabel : action}
      </button>
    </section>
  );
}
