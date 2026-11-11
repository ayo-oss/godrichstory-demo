import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DateRangeCalendarSelect.module.scss";

export type DateRangeCalendarSelectProps = {
  month?: string;
  dow?: string[];
  days?: number;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

export default function DateRangeCalendarSelect({
  month = "Sep",
  dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  days = 21,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff9ebb",
}: DateRangeCalendarSelectProps) {
  const [start, setStart] = useState<number | null>(3);
  const [end, setEnd] = useState<number | null>(8);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  function pick(n: number) {
    if (start === null || (start !== null && end !== null)) {
      setStart(n); setEnd(null);
    } else if (n < start) {
      setEnd(start); setStart(n);
    } else {
      setEnd(n);
    }
  }

  return (
    <div className={styles.cal} style={vars}>
      <div className={styles.head}>{month}</div>
      <div className={styles.grid}>
        {dow.map((d) => (
          <div key={d} className={styles.dow}>{d}</div>
        ))}
      </div>
      <div className={styles.row}>
        {Array.from({ length: days }, (_, i) => i + 1).map((n, i) => {
          const inRange = start !== null && end !== null && n >= start && n <= end;
          const isEdge = n === start || n === end;
          return (
            <button
              key={n}
              type="button"
              className={styles.day}
              data-range={inRange}
              data-edge={isEdge}
              aria-selected={isEdge}
              tabIndex={i === 0 ? 0 : -1}
              onClick={() => pick(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
