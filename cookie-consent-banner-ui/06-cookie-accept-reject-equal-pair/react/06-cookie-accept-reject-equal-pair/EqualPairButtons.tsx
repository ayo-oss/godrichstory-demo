import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EqualPairButtons.module.scss";

export type EqualPairButtonsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const ITEMS = ["Essential", "Visit analytics", "Personalized ads"];

const DONE: Record<string, string> = {
  reject: "Saved: all cookies rejected",
  accept: "Saved: all cookies accepted",
};

export default function EqualPairButtons({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: EqualPairButtonsProps) {
  const [live, setLive] = useState(true);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  const decide = (value: string): void => {
    setLive(false);
    setDone(value);
    try {
      localStorage.setItem("gd-consent-06", value);
    } catch (e) {
      /* 샌드박스에서 던질 수 있다 */
    }
  };

  return (
    <div className={`${styles.ep} ${live ? styles.demo : ""}`} style={vars}>
      {done ? (
        <p className={styles.done}>{DONE[done]}</p>
      ) : (
        <div className={styles.main}>
          <b className={styles.title}>Allow cookies?</b>
          <p className={styles.desc}>Rejecting them will not affect your visit.</p>

          <div className={styles.pair}>
            <button
              className={`${styles.btn} ${styles.btnReject}`}
              type="button"
              onClick={() => decide("reject")}
            >
              Reject all
            </button>
            <button
              className={`${styles.btn} ${styles.btnAccept}`}
              type="button"
              onClick={() => decide("accept")}
            >
              Accept all
            </button>
          </div>

          {open ? (
            <ul className={styles.items}>
              {ITEMS.map((item, i) => (
                <li key={item}>
                  <label className={styles.item}>
                    <input
                      className={styles.check}
                      type="checkbox"
                      defaultChecked={i < 2}
                      disabled={i === 0}
                    />
                    <span className={styles.label}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            className={styles.link}
            type="button"
            aria-pressed={open}
            onClick={() => {
              setLive(false);
              setOpen(!open);
            }}
          >
            Choose by purpose
          </button>
        </div>
      )}
    </div>
  );
}
