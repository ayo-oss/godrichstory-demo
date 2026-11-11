import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./HalfGaugeNeedle.module.scss";

export type HalfGaugeNeedleProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--num"?: string;
};

export default function HalfGaugeNeedle({
  duration = 600,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#4cd4a6",
}: HalfGaugeNeedleProps) {
  const [num, setNum] = useState(62);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num": String(num),
  };
  // --num 하나로 호의 dashoffset 과 바늘의 rotate 를 같이 몬다. 0~100 밖으로는 안 나간다
  const step = (d: number) => setNum((n) => Math.min(100, Math.max(0, n + d)));

  return (
    <div className={styles.hg} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 152 112" width="152" height="112" aria-hidden="true">
          <path className={styles.track} d="M14 76A62 62 0 0 1 138 76" />
          <path className={styles.arc} d="M14 76A62 62 0 0 1 138 76" />
          <g className={styles.needle}>
            <line x1="76" y1="76" x2="76" y2="28" />
            <circle cx="76" cy="76" r="6" />
          </g>
        </svg>
        <div className={styles.read}>
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2" />
                <path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z" />
              </g>
            </svg>
          </span>
          <span className={styles.num} role="status" aria-label="CPU usage" />
        </div>
      </div>
      <div className={styles.ctrl}>
        <button className={styles.btn} type="button" aria-label="Decrease by 10" onClick={() => step(-10)}>
          −
        </button>
        <span className={styles.cap}>CPU usage</span>
        <button className={styles.btn} type="button" aria-label="Increase by 10" onClick={() => step(10)}>
          +
        </button>
      </div>
    </div>
  );
}
