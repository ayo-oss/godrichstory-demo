import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SegmentedStepRing.module.scss";

export type SegmentedStepRingProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--n"?: number;
};

type SegVars = CSSProperties & { "--i"?: number };

const TOTAL = 8;
const SEGS = [0, 1, 2, 3, 4, 5, 6, 7];

export default function SegmentedStepRing({
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: SegmentedStepRingProps) {
  const [n, setN] = useState(0);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--n": n,
  };

  return (
    <div className={styles.sg} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
          <g>
            {SEGS.map((i) => {
              const seg: SegVars = { "--i": i };
              return (
                <circle
                  key={i}
                  className={`${styles.seg} ${i < n ? styles.on : ""}`}
                  style={seg}
                  cx="52"
                  cy="52"
                  r="44"
                />
              );
            })}
          </g>
        </svg>
        <div className={styles.center}>
          <span className={styles.ic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="14" height="14">
              <g fill="currentColor">
                <path d="m96 240l16-80l-64-24L160 16l-16 80l64 24Z" opacity=".2" />
                <path d="M215.79 118.17a8 8 0 0 0-5-5.66L153.18 90.9l14.66-73.33a8 8 0 0 0-13.69-7l-112 120a8 8 0 0 0 3 13l57.63 21.61l-14.62 73.25a8 8 0 0 0 13.69 7l112-120a8 8 0 0 0 1.94-7.26M109.37 214l10.47-52.38a8 8 0 0 0-5-9.06L62 132.71l84.62-90.66l-10.46 52.38a8 8 0 0 0 5 9.06l52.8 19.8Z" />
              </g>
            </svg>
          </span>
          <span className={styles.frac} role="status" aria-label="Completed steps" />
          <span className={styles.cap}>Steps</span>
        </div>
      </div>
      <button
        type="button"
        className={styles.btn}
        onClick={() => setN((v) => (v >= TOTAL ? 0 : v + 1))}
      >
        Next step
      </button>
    </div>
  );
}
