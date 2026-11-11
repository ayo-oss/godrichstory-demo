import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./InboxZeroCard.module.scss";

export type InboxZeroCardProps = {
  title?: string;
  idle?: string;
  busy?: string;
  done?: string;
  action?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function InboxZeroCard({
  title = "Your inbox is empty",
  idle = "0 unread messages",
  busy = "Checking",
  done = "0 unread · checked {n}x",
  action = "Refresh",
  duration = 2000,
  easing = "ease-in-out",
  color = "#fff7e6",
}: InboxZeroCardProps) {
  const [sub, setSub] = useState(idle);
  const [loop, setLoop] = useState(true);
  const [busyNow, setBusyNow] = useState(false);
  const [count, setCount] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function refresh() {
    if (busyNow) return;
    setLoop(false);
    setBusyNow(true);
    setSub(busy);
    window.setTimeout(() => {
      const n = count + 1;
      setCount(n);
      setSub(done.replace("{n}", String(n)));
      setBusyNow(false);
    }, 700);
  }

  return (
    <section className={`${styles.ez} ${loop ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.art}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="1em" height="1em">
            <g fill="currentColor">
              <path d="M216 48v112h-36.69a8 8 0 0 0-5.66 2.34l-19.31 19.32a8 8 0 0 1-5.66 2.34h-41.37a8 8 0 0 1-5.66-2.34l-19.31-19.32a8 8 0 0 0-5.66-2.34H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2" />
              <path d="M208 32H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16m0 16v104h-28.7a15.86 15.86 0 0 0-11.3 4.69L148.69 176h-41.38L88 156.68A15.9 15.9 0 0 0 76.69 152H48V48Zm0 160H48v-40h28.69L96 187.32a15.9 15.9 0 0 0 11.31 4.68h41.38a15.86 15.86 0 0 0 11.31-4.69L179.31 168H208z" />
            </g>
          </svg>
        </span>
        <span className={styles.shadow} aria-hidden="true" />
      </div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.sub} aria-live="polite">{sub}</p>
      <button className={styles.btn} type="button" onClick={refresh} disabled={busyNow}>{action}</button>
    </section>
  );
}
