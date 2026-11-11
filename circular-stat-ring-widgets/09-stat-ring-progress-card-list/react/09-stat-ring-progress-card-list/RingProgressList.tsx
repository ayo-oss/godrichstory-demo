import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import styles from "./RingProgressList.module.scss";

export type RingProgressListProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type RowVars = CSSProperties & { "--v"?: string };

const ROWS: { name: string; icon: ReactNode }[] = [
  {
    name: "Design system",
    icon: (
      <svg viewBox="0 0 256 256" width="12" height="12">
        <g fill="currentColor">
          <path d="M176 128a48 48 0 1 1-48-48a48 48 0 0 1 48 48" opacity=".2" />
          <path d="M221.87 83.16A104.1 104.1 0 1 1 195.67 49l22.67-22.68a8 8 0 0 1 11.32 11.32l-96 96a8 8 0 0 1-11.32-11.32l27.72-27.72a40 40 0 1 0 17.87 31.09a8 8 0 1 1 16-.9a56 56 0 1 1-22.38-41.65l22.75-22.75a87.88 87.88 0 1 0 23.13 29.67a8 8 0 0 1 14.44-6.9" />
        </g>
      </svg>
    ),
  },
  {
    name: "Docs cleanup",
    icon: (
      <svg viewBox="0 0 256 256" width="12" height="12">
        <g fill="currentColor">
          <path d="M208 144a80 80 0 0 1-160 0c0-72 80-128 80-128s80 56 80 128" opacity=".2" />
          <path d="M174 47.75a254.2 254.2 0 0 0-41.45-38.3a8 8 0 0 0-9.18 0A254.2 254.2 0 0 0 82 47.75C54.51 79.32 40 112.6 40 144a88 88 0 0 0 176 0c0-31.4-14.51-64.68-42-96.25M128 216a72.08 72.08 0 0 1-72-72c0-57.23 55.47-105 72-118c16.53 13 72 60.75 72 118a72.08 72.08 0 0 1-72 72m55.89-62.66a57.6 57.6 0 0 1-46.56 46.55a9 9 0 0 1-1.33.11a8 8 0 0 1-1.32-15.89c16.57-2.79 30.63-16.85 33.44-33.45a8 8 0 0 1 15.78 2.68Z" />
        </g>
      </svg>
    ),
  },
  {
    name: "Onboarding video",
    icon: (
      <svg viewBox="0 0 256 256" width="12" height="12">
        <g fill="currentColor">
          <path d="M232 102c0 66-104 122-104 122S24 168 24 102a54 54 0 0 1 54-54c22.59 0 41.94 12.31 50 32c8.06-19.69 27.41-32 50-32a54 54 0 0 1 54 54" opacity=".2" />
          <path d="M72 144H32a8 8 0 0 1 0-16h35.72l13.62-20.44a8 8 0 0 1 13.32 0l25.34 38l9.34-14A8 8 0 0 1 136 128h24a8 8 0 0 1 0 16h-19.72l-13.62 20.44a8 8 0 0 1-13.32 0L88 126.42l-9.34 14A8 8 0 0 1 72 144M178 40c-20.65 0-38.73 8.88-50 23.89C116.73 48.88 98.65 40 78 40a62.07 62.07 0 0 0-62 62v2.25a8 8 0 1 0 16-.5V102a46.06 46.06 0 0 1 46-46c19.45 0 35.78 10.36 42.6 27a8 8 0 0 0 14.8 0c6.82-16.67 23.15-27 42.6-27a46.06 46.06 0 0 1 46 46c0 53.61-77.76 102.15-96 112.8c-10.83-6.31-42.63-26-66.68-52.21a8 8 0 1 0-11.8 10.82c31.17 34 72.93 56.68 74.69 57.63a8 8 0 0 0 7.58 0C136.21 228.66 240 172 240 102a62.07 62.07 0 0 0-62-62" />
        </g>
      </svg>
    ),
  },
];

export default function RingProgressList({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: RingProgressListProps) {
  const [values, setValues] = useState<number[]>([78, 52, 34]);

  // one click bumps only that row by 10 — ring and percentage read the same --v, so they cannot drift apart
  const bump = (idx: number) => {
    setValues((vs) => vs.map((v, i) => (i === idx ? (v >= 100 ? 0 : Math.min(100, v + 10)) : v)));
  };

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.pl} style={vars}>
      {ROWS.map((row, i) => {
        const rowVars: RowVars = { "--v": String(values[i]) };
        return (
          <li key={row.name} className={styles.row} style={rowVars}>
            <button className={styles.hit} type="button" onClick={() => bump(i)}>
              <span className={styles.dial}>
                <svg className={styles.svg} viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
                  <circle className={styles.track} cx="18" cy="18" r="14" />
                  <circle className={styles.ring} cx="18" cy="18" r="14" />
                </svg>
                <span className={styles.ic} aria-hidden="true">{row.icon}</span>
              </span>
              <span className={styles.name}>{row.name}</span>
              <span className={styles.pct} role="status" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
