import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GoalCountUpRing.module.scss";

export type GoalCountUpRingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--num"?: number;
};

export default function GoalCountUpRing({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: GoalCountUpRingProps) {
  const [num, setNum] = useState(72);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num": num,
  };

  return (
    <div className={styles.gr} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
          <circle className={styles.track} cx="64" cy="64" r="52" />
          <circle className={styles.ring} cx="64" cy="64" r="52" />
        </svg>
        <div className={styles.center}>
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="15" height="15">
              <g fill="currentColor">
                <path d="M176 128a48 48 0 1 1-48-48a48 48 0 0 1 48 48" opacity=".2" />
                <path d="M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9" />
              </g>
            </svg>
          </span>
          <span className={styles.num} role="status" aria-label="Goal completion" />
          <span className={styles.cap}>Monthly goal</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setNum(20 + Math.floor(Math.random() * 80))}
      >
        Set new goal
      </button>
    </div>
  );
}
