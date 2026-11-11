import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CompareRingPair.module.scss";

export type CompareRingPairProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--a"?: string;
  "--b"?: string;
  "--d"?: string;
};

export default function CompareRingPair({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: CompareRingPairProps) {
  const [pair, setPair] = useState<{ now: number; prev: number }>({ now: 72, prev: 58 });

  // this week's value slides into last week's slot and a new one comes in
  const nextWeek = () => {
    setPair((p) => ({ prev: p.now, now: 20 + Math.floor(Math.random() * 80) }));
  };

  const down = pair.now < pair.prev;
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--a": String(pair.now),
    "--b": String(pair.prev),
    "--d": String(Math.abs(pair.now - pair.prev)),
  };

  return (
    <div className={`${styles.bp} ${down ? styles.isDown : ""}`} style={vars}>
      <div className={styles.pair}>
        <figure className={`${styles.cell} ${styles.cellNow}`}>
          <div className={styles.dial}>
            <svg className={styles.svg} viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
              <circle className={styles.track} cx="44" cy="44" r="36" />
              <circle className={styles.ring} cx="44" cy="44" r="36" />
            </svg>
            <span className={styles.num} role="status" aria-label="This week's rate" />
          </div>
          <figcaption className={styles.cap}>This week</figcaption>
        </figure>
        <span className={styles.delta}>
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="13" height="13">
              <g fill="currentColor">
                <path d="M232 56v64l-64-64Z" opacity=".2" />
                <path d="M232 48h-64a8 8 0 0 0-5.66 13.66L188.69 88L136 140.69l-34.34-34.35a8 8 0 0 0-11.32 0l-72 72a8 8 0 0 0 11.32 11.32L96 123.31l34.34 34.35a8 8 0 0 0 11.32 0L200 99.31l26.34 26.35A8 8 0 0 0 240 120V56a8 8 0 0 0-8-8m-8 52.69L187.31 64H224Z" />
              </g>
            </svg>
          </span>
        </span>
        <figure className={`${styles.cell} ${styles.cellPrev}`}>
          <div className={styles.dial}>
            <svg className={styles.svg} viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
              <circle className={styles.track} cx="44" cy="44" r="36" />
              <circle className={styles.ring} cx="44" cy="44" r="36" />
            </svg>
            <span className={styles.num} aria-hidden="true" />
          </div>
          <figcaption className={styles.cap}>Last week</figcaption>
        </figure>
      </div>
      <button className={styles.btn} type="button" onClick={nextWeek}>
        Next week
      </button>
    </div>
  );
}
