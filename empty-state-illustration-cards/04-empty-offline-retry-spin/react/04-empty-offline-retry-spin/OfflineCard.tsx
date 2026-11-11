import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./OfflineCard.module.scss";

export type OfflineCardProps = {
  title?: string;
  idle?: string;
  busy?: string;
  again?: string;
  action?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function OfflineCard({
  title = "You are offline",
  idle = "Could not load the list",
  busy = "Checking the connection",
  again = "Still offline · {n} tries",
  action = "Try again",
  duration = 2000,
  easing = "linear",
  color = "#0a4fe8",
}: OfflineCardProps) {
  const [sub, setSub] = useState(idle);
  const [trying, setTrying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [tries, setTries] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function retry() {
    if (trying) return;
    setLoop(false);
    setTrying(true);
    setSub(busy);
    window.setTimeout(() => {
      const n = tries + 1;
      setTries(n);
      setTrying(false);
      setSub(again.replace("{n}", String(n)));
    }, 900);
  }

  const cls = [styles.of, loop ? styles.isDemo : "", trying ? styles.isTrying : ""].join(" ");

  return (
    <section className={cls} style={vars}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 256 256" width="1em" height="1em">
          <g fill="currentColor">
            <path d="m238.2 87.69l-104 125.43a8 8 0 0 1-12.3 0L17.8 87.69a7.79 7.79 0 0 1 1.31-11.21a180.75 180.75 0 0 1 217.78 0a7.79 7.79 0 0 1 1.31 11.21" opacity=".2" />
            <path d="M53.92 34.62a8 8 0 1 0-11.84 10.76l4.55 5A188 188 0 0 0 14.28 70.1a15.93 15.93 0 0 0-6.17 10.81a15.65 15.65 0 0 0 3.54 11.89l104 125.43A15.93 15.93 0 0 0 128 224a15.93 15.93 0 0 0 12.31-5.77l28.1-33.88l33.67 37a8 8 0 1 0 11.84-10.76ZM128 208L24.09 82.74a171.5 171.5 0 0 1 33.82-19.95l99.63 109.6ZM244.35 92.8l-49.42 59.58a8 8 0 0 1-12.32-10.21l49.3-59.43A170.76 170.76 0 0 0 128 48a175 175 0 0 0-32.39 3a8 8 0 1 1-3-15.72A190.6 190.6 0 0 1 128 32a186.67 186.67 0 0 1 113.72 38.1a15.93 15.93 0 0 1 6.17 10.81a15.65 15.65 0 0 1-3.54 11.89" />
          </g>
        </svg>
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub} aria-live="polite">{sub}</p>
      <button className={styles.btn} type="button" onClick={retry} disabled={trying}>
        <span className={styles.arrow} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="M216 128a88 88 0 1 1-88-88a88 88 0 0 1 88 88" opacity=".2" />
              <path d="M224 48v48a8 8 0 0 1-8 8h-48a8 8 0 0 1 0-16h28.69l-14.63-14.63a79.56 79.56 0 0 0-56.13-23.43h-.45a79.52 79.52 0 0 0-55.89 22.77a8 8 0 0 1-11.18-11.44a96 96 0 0 1 135 .79L208 76.69V48a8 8 0 0 1 16 0m-37.59 135.29a80 80 0 0 1-112.47-.66L59.31 168H88a8 8 0 0 0 0-16H40a8 8 0 0 0-8 8v48a8 8 0 0 0 16 0v-28.69l14.63 14.63A95.43 95.43 0 0 0 130 222.06h.53a95.36 95.36 0 0 0 67.07-27.33a8 8 0 0 0-11.18-11.44Z" />
            </g>
          </svg>
        </span>
        <span className={styles.btnT}>{action}</span>
      </button>
    </section>
  );
}
