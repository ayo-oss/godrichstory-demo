import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./TodayRingCalendar.module.scss";

/** 로컬 이벤트 타입 — 라이브러리 타입을 끌어오지 않는다 */
export type DayCount = { day: number; count: number };

export type TodayRingCalendarProps = {
  month?: Date;
  today?: number;
  counts?: DayCount[];
  /** 펄스 한 바퀴(ms) */
  duration?: number;
  easing?: string;
  color?: string;
  dayNames?: string[];
  /** 배지 접근 이름. {n} 이 건수로 바뀐다 */
  countLabel?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

export default function TodayRingCalendar({
  month = new Date(2026, 8, 1),
  today = 15,
  counts = [{ day: 8, count: 1 }, { day: 15, count: 2 }, { day: 22, count: 4 }],
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
  dayNames = ["S", "M", "T", "W", "T", "F", "S"],
  countLabel = "{n} events",
}: TodayRingCalendarProps) {
  const [focused, setFocused] = useState(() => 0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const y = month.getFullYear();
  const m = month.getMonth();
  const off = 1 - new Date(y, m, 1).getDay();
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(y, m, off + i);
    return { date: d, outside: d.getMonth() !== m };
  });
  const startIdx = cells.findIndex((c) => !c.outside && c.date.getDate() === today);
  const sel = focused || (startIdx < 0 ? 0 : startIdx);

  function setCell(n: number) {
    return (el: HTMLDivElement | null) => {
      const a = cellRefs.current;
      if (a) a[n] = el;
    };
  }

  function move(n: number) {
    const to = Math.max(0, Math.min(34, n));
    setFocused(to);
    cellRefs.current?.[to]?.focus({ preventScroll: true });
  }

  function onKeyDown(e: KeyEvt, n: number) {
    let to: number | null = null;
    if (e.key === "ArrowRight") to = n + 1;
    else if (e.key === "ArrowLeft") to = n - 1;
    else if (e.key === "ArrowDown") to = n + 7;
    else if (e.key === "ArrowUp") to = n - 7;
    else if (e.key === "Home") to = n - (n % 7);
    else if (e.key === "End") to = n - (n % 7) + 6;
    if (to === null) return;
    e.preventDefault();
    move(to);
  }

  return (
    <div className={styles.cal} style={vars}>
      <div className={styles.bar}>
        <h2 className={styles.title} id="trc-title">{y}. {m + 1}</h2>
      </div>
      <div className={styles.dows} aria-hidden="true">
        {dayNames.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
      </div>
      <div className={styles.grid} role="grid" aria-labelledby="trc-title">
        {[0, 1, 2, 3, 4].map((w) => (
          <div key={w} className={styles.row} role="row">
            {cells.slice(w * 7, w * 7 + 7).map((c, i) => {
              const n = w * 7 + i;
              const isToday = !c.outside && c.date.getDate() === today;
              const hit = c.outside ? undefined : counts.find((x) => x.day === c.date.getDate());
              return (
                <div
                  key={c.date.getTime()}
                  ref={setCell(n)}
                  className={`${styles.cell} ${c.outside ? styles.isOut : ""} ${isToday ? styles.isToday : ""}`}
                  role="gridcell"
                  aria-current={isToday ? "date" : undefined}
                  aria-selected={n === sel}
                  tabIndex={n === sel ? 0 : -1}
                  onClick={() => move(n)}
                  onKeyDown={(e: KeyEvt) => onKeyDown(e, n)}
                >
                  <span className={styles.n}>{c.date.getDate()}</span>
                  {hit ? (
                    <span className={styles.badge} aria-label={countLabel.replace("{n}", String(hit.count))}>
                      {hit.count}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
