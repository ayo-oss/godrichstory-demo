import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./EventChipsCalendar.module.scss";

/** 로컬 이벤트 타입 — 라이브러리 타입을 끌어오지 않는다 */
export type CalEvent = { day: number; title: string; tone: "blue" | "ink" | "mint" };

export type EventChipsCalendarProps = {
  month?: Date;
  events?: CalEvent[];
  /** 한 칸에 접지 않고 보여줄 칩 수 */
  visible?: number;
  /** 펼침 전환 시간(ms) */
  duration?: number;
  easing?: string;
  color?: string;
  dayNames?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void; stopPropagation: () => void };
type ClickEvt = { stopPropagation: () => void };

const TONE: Record<CalEvent["tone"], string> = { blue: styles.blue, ink: styles.ink, mint: styles.mint };

export default function EventChipsCalendar({
  month = new Date(2026, 8, 1),
  events = [
    { day: 16, title: "Standup", tone: "blue" },
    { day: 16, title: "Dentist", tone: "ink" },
    { day: 16, title: "Gym", tone: "mint" },
    { day: 16, title: "Report", tone: "blue" },
    { day: 16, title: "Dinner", tone: "ink" },
  ],
  visible = 2,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  dayNames = ["S", "M", "T", "W", "T", "F", "S"],
}: EventChipsCalendarProps) {
  const [open, setOpen] = useState<number | null>(null);
  const [focused, setFocused] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const y = month.getFullYear();
  const m = month.getMonth();
  const off = 1 - new Date(y, m, 1).getDay();
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(y, m, off + i);
    return { date: d, outside: d.getMonth() !== m };
  });

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
        <h2 className={styles.title} id="ecc-title">{y}. {m + 1}</h2>
      </div>
      <div className={styles.dows} aria-hidden="true">
        {dayNames.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
      </div>
      <div className={styles.grid} role="grid" aria-labelledby="ecc-title">
        {[0, 1, 2, 3, 4].map((w) => (
          <div key={w} className={styles.row} role="row">
            {cells.slice(w * 7, w * 7 + 7).map((c, i) => {
              const n = w * 7 + i;
              const mine = c.outside ? [] : events.filter((ev) => ev.day === c.date.getDate());
              const head = mine.slice(0, visible);
              const rest = mine.slice(visible);
              const isOpen = open === n;
              return (
                <div
                  key={c.date.getTime()}
                  ref={setCell(n)}
                  className={[
                    styles.cell,
                    c.outside ? styles.isOut : "",
                    mine.length ? styles.isChips : "",
                    isOpen ? styles.isOpen : "",
                  ].join(" ")}
                  role="gridcell"
                  aria-selected={n === focused}
                  tabIndex={n === focused ? 0 : -1}
                  onClick={() => move(n)}
                  onKeyDown={(e: KeyEvt) => onKeyDown(e, n)}
                >
                  {mine.length ? <span className={styles.n}>{c.date.getDate()}</span> : c.date.getDate()}
                  {head.map((ev) => (
                    <span key={ev.title} className={`${styles.chip} ${TONE[ev.tone]}`}>{ev.title}</span>
                  ))}
                  {rest.length ? (
                    <>
                      <button
                        type="button"
                        className={styles.morebtn}
                        aria-expanded={isOpen}
                        aria-controls={`ecc-more-${n}`}
                        onClick={(e: ClickEvt) => { e.stopPropagation(); setOpen(isOpen ? null : n); }}
                        onKeyDown={(e: KeyEvt) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault(); e.stopPropagation(); setOpen(isOpen ? null : n);
                          }
                        }}
                      >
                        +{rest.length}
                      </button>
                      <span className={styles.morewrap} id={`ecc-more-${n}`}>
                        <span className={styles.more}>
                          {rest.map((ev) => (
                            <span key={ev.title} className={`${styles.chip} ${TONE[ev.tone]}`}>{ev.title}</span>
                          ))}
                        </span>
                      </span>
                    </>
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
