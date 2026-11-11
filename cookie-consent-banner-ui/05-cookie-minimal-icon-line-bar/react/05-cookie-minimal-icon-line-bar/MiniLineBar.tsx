import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MiniLineBar.module.scss";

export type MiniLineBarProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

function CookieIcon() {
  return (
    <svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true">
      <g fill="currentColor">
        <path d="M224 128a96 96 0 1 1-96-96a48 48 0 0 0 48 48a48 48 0 0 0 48 48" opacity=".2" />
        <path d="M164.49 163.51a12 12 0 1 1-17 0a12 12 0 0 1 17 0m-81-8a12 12 0 1 0 17 0a12 12 0 0 0-16.98 0Zm9-39a12 12 0 1 0-17 0a12 12 0 0 0 17-.02Zm48-1a12 12 0 1 0 0 17a12 12 0 0 0 0-17M232 128A104 104 0 1 1 128 24a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8m-16.31 7.39A56.13 56.13 0 0 1 168.5 87.5a56.13 56.13 0 0 1-47.89-47.19a88 88 0 1 0 95.08 95.08" />
      </g>
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
      </g>
    </svg>
  );
}

export default function MiniLineBar({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: MiniLineBarProps) {
  const [live, setLive] = useState(true);
  const [gone, setGone] = useState(false);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  const dismiss = (value: string): void => {
    setLive(false);
    setGone(true);
    try {
      localStorage.setItem("gd-consent-05", value);
    } catch (e) {
      /* 샌드박스에서 던질 수 있다 */
    }
  };

  return (
    <div className={styles.mb} style={vars}>
      <div className={styles.top} aria-hidden="true">
        <i className={styles.dot} />
        <i className={styles.dot} />
        <i className={styles.dot} />
      </div>
      <div className={styles.lines} aria-hidden="true">
        <i className={`${styles.line} ${styles.lineTitle}`} />
        <i className={styles.line} />
        <i className={styles.line} />
        <i className={`${styles.line} ${styles.lineShort}`} />
      </div>

      <div
        className={`${styles.bar} ${live ? styles.demo : ""} ${gone ? styles.gone : ""}`}
        role="region"
        aria-label="Cookie notice"
      >
        <span className={styles.cookie}>
          <CookieIcon />
        </span>
        <p className={styles.text}>We use cookies. Continuing means you accept them.</p>
        <button className={styles.ok} type="button" onClick={() => dismiss("accept")}>
          OK
        </button>
        <button
          className={styles.x}
          type="button"
          aria-label="Close"
          onClick={() => dismiss("close")}
        >
          <span className={styles.xic}>
            <XIcon />
          </span>
        </button>
      </div>
    </div>
  );
}
