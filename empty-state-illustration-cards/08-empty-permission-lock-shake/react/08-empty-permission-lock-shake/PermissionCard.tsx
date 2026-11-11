import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PermissionCard.module.scss";

export type PermissionCardProps = {
  denied?: string;
  waiting?: string;
  action?: string;
  sent?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PermissionCard({
  denied = "You do not have access",
  waiting = "Waiting for an admin to approve",
  action = "Request access",
  sent = "Request sent",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: PermissionCardProps) {
  const [asked, setAsked] = useState(false);
  const [loop, setLoop] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={`${styles.pm} ${loop ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.panel}>
        <ul className={styles.rows} aria-hidden="true">
          <li className={styles.row} />
          <li className={styles.row} />
          <li className={styles.row} />
        </ul>
        <div className={styles.gate}>
          <span className={styles.lock} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="1em" height="1em">
              <g fill="currentColor">
                <path d="M208 88H48a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h160a8 8 0 0 0 8-8V96a8 8 0 0 0-8-8m-80 72a20 20 0 1 1 20-20a20 20 0 0 1-20 20" opacity=".2" />
                <path d="M208 80h-32V56a48 48 0 0 0-96 0v24H48a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V96a16 16 0 0 0-16-16M96 56a32 32 0 0 1 64 0v24H96Zm112 152H48V96h160zm-80-96a28 28 0 0 0-8 54.83V184a8 8 0 0 0 16 0v-17.17a28 28 0 0 0-8-54.83m0 40a12 12 0 1 1 12-12a12 12 0 0 1-12 12" />
              </g>
            </svg>
          </span>
          <p className={styles.msg} aria-live="polite">{asked ? waiting : denied}</p>
        </div>
      </div>
      <button
        className={styles.btn}
        type="button"
        disabled={asked}
        onClick={() => { setLoop(false); setAsked(true); }}
      >
        {asked ? sent : action}
      </button>
    </section>
  );
}
