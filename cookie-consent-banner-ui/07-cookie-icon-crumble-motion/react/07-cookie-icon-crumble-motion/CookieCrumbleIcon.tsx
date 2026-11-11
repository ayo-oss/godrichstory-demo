import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CookieCrumbleIcon.module.scss";

export type CookieCrumbleIconProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const KEY = "gd-consent-07";

export default function CookieCrumbleIcon({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: CookieCrumbleIconProps) {
  const [count, setCount] = useState(0);
  // 0 이면 자동 루프, 1 이상이면 그 번째 한 번짜리 재생 (key 로 갈아끼워 애니메이션을 되감는다)
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setCount(parseInt(raw, 10) || 0);
      }
    } catch {
      /* 샌드박스에서 던질 수 있다 */
    }
  }, []);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };

  const demo = runId === 0;

  function replay() {
    const next = count + 1;
    setCount(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* 무시 */
    }
    setRunId(runId + 1);
  }

  return (
    <div className={`${styles.ck} ${demo ? styles.isDemo : styles.isBurst}`} style={vars}>
      <div className={styles.art} key={runId}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="120" height="120">
            <g fill="currentColor">
              <path
                d="M224 128a96 96 0 1 1-96-96a48 48 0 0 0 48 48a48 48 0 0 0 48 48"
                opacity=".2"
              />
              <path d="M164.49 163.51a12 12 0 1 1-17 0a12 12 0 0 1 17 0m-81-8a12 12 0 1 0 17 0a12 12 0 0 0-16.98 0Zm9-39a12 12 0 1 0-17 0a12 12 0 0 0 17-.02Zm48-1a12 12 0 1 0 0 17a12 12 0 0 0 0-17M232 128A104 104 0 1 1 128 24a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8a40 40 0 0 0 40 40a8 8 0 0 1 8 8m-16.31 7.39A56.13 56.13 0 0 1 168.5 87.5a56.13 56.13 0 0 1-47.89-47.19a88 88 0 1 0 95.08 95.08" />
            </g>
          </svg>
        </span>
        <i className={`${styles.crumb} ${styles.crumbA}`} aria-hidden="true" />
        <i className={`${styles.crumb} ${styles.crumbB}`} aria-hidden="true" />
        <i className={`${styles.crumb} ${styles.crumbC}`} aria-hidden="true" />
      </div>

      <p className={styles.label}>
        Consent saved<b className={styles.count}>{count}</b>
      </p>

      <button type="button" className={styles.btn} onClick={replay}>
        Replay
      </button>
    </div>
  );
}
