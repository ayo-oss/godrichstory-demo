import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CalendarWidget.module.scss";

export type CalendarWidgetProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const DOWS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const EVENTS = [4, 11, 22];
const TODAY = { y: 2026, m: 8, d: 11 };

export default function CalendarWidget({ duration = 220, easing = "ease-out", color = "#ff9ebb" }: CalendarWidgetProps) {
  const [cur, setCur] = useState({ y: 2026, m: 8 });
  const [selected, setSelected] = useState<number | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const days = useMemo(() => {
    const first = new Date(cur.y, cur.m, 1).getDay();
    const count = new Date(cur.y, cur.m + 1, 0).getDate();
    return { blanks: first, count };
  }, [cur]);

  function nav(dir: number) {
    setCur((c) => {
      let m = c.m + dir, y = c.y;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { y, m };
    });
    setSelected(null);
  }

  const monthLabel = new Date(cur.y, cur.m, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={styles.cal} style={vars}>
      <div className={styles.head}>
        <button type="button" className={styles.nav} aria-label="Previous month" onClick={() => nav(-1)}>‹</button>
        <strong className={styles.month}>{monthLabel}</strong>
        <button type="button" className={styles.nav} aria-label="Next month" onClick={() => nav(1)}>›</button>
      </div>
      <div className={styles.dows}>{DOWS.map((d) => <span key={d} className={styles.dow}>{d}</span>)}</div>
      <div className={styles.grid}>
        {Array.from({ length: days.blanks }).map((_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days.count }).map((_, i) => {
          const d = i + 1;
          const isToday = cur.y === TODAY.y && cur.m === TODAY.m && d === TODAY.d;
          const hasEvent = cur.y === TODAY.y && cur.m === TODAY.m && EVENTS.includes(d);
          return (
            <button
              key={d}
              type="button"
              className={`${styles.day} ${isToday ? styles.today : ""} ${hasEvent ? styles.event : ""}`}
              aria-pressed={selected === d}
              onClick={() => setSelected(d)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
