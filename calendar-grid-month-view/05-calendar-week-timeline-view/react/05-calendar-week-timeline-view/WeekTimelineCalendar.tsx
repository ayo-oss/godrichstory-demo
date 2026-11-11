import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeekTimelineCalendar.module.scss";

export type TimelineEvent = {
  /** 열 index (0 = 첫 요일) */
  col: number;
  /** 시작 시각 — hours 배열의 값 */
  hour: number;
  /** 길이(시간 단위) */
  span: number;
  title: string;
  /** 같은 시각에 겹치는 두 블록: "l" = 왼쪽 절반, "r" = 오른쪽 절반 */
  half?: "l" | "r";
  tone?: "a" | "b";
};

export type WeekTimelineCalendarProps = {
  hours?: number[];
  cols?: string[];
  events?: TimelineEvent[];
  /** 지금 시각 선이 한 바퀴 도는 시간(ms) */
  duration?: number;
  easing?: string;
  color?: string;
  todayCol?: number;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string; "--n"?: number;
};
type KeyEvt = { key: string; preventDefault: () => void };

const DEFAULT_EVENTS: TimelineEvent[] = [
  { col: 0, hour: 9, span: 1.5, title: "회의" },
  { col: 4, hour: 9, span: 2, title: "회의" },
  { col: 1, hour: 10, span: 1, title: "리뷰", tone: "b" },
  { col: 2, hour: 11, span: 1, title: "리뷰", half: "l" },
  { col: 2, hour: 11, span: 1, title: "회의", half: "r", tone: "b" },
  { col: 3, hour: 12, span: 1, title: "점심" },
];

export default function WeekTimelineCalendar({
  hours = [9, 10, 11, 12, 13],
  cols = ["14", "15", "16", "17", "18"],
  events = DEFAULT_EVENTS,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
  todayCol = 2,
}: WeekTimelineCalendarProps) {
  const [focus, setFocus] = useState(0);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const moved = useRef(false);
  const n = cols.length;
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    if (!moved.current) return;
    const el = cellRefs.current ? cellRefs.current[focus] : null;
    if (el) el.focus({ preventScroll: true });
  }, [focus]);

  function onKeyDown(i: number, e: KeyEvt) {
    let k = i;
    if (e.key === "ArrowLeft") k = i - 1;
    else if (e.key === "ArrowRight") k = i + 1;
    else if (e.key === "ArrowUp") k = i - n;
    else if (e.key === "ArrowDown") k = i + n;
    else if (e.key === "Home") k = i - (i % n);
    else if (e.key === "End") k = i - (i % n) + n - 1;
    else return;
    if (k < 0 || k >= hours.length * n) return;
    e.preventDefault();
    moved.current = true;
    setFocus(k);
  }

  return (
    <div className={styles.wt} style={vars}>
      <div className={styles.body}>
        <div className={styles.side} aria-hidden="true">
          <span className={styles.ico}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 256 256">
              <g fill="currentColor">
                <path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2" />
                <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88m64-88a8 8 0 0 1-8 8h-56a8 8 0 0 1-8-8V72a8 8 0 0 1 16 0v48h48a8 8 0 0 1 8 8" />
              </g>
            </svg>
          </span>
          {hours.map((h) => <span className={styles.hr} key={h}>{h}</span>)}
        </div>

        <div className={styles.grid} role="grid">
          <div className={`${styles.row} ${styles.rowHead}`} role="row">
            {cols.map((c, i) => (
              <span
                key={c}
                className={`${styles.h} ${i === todayCol ? styles.isToday : ""}`}
                role="columnheader"
                aria-current={i === todayCol ? "date" : undefined}
              >
                {c}
              </span>
            ))}
          </div>
          {hours.map((h, r) => (
            <div className={styles.row} role="row" key={h}>
              {cols.map((c, ci) => {
                const i = r * n + ci;
                const here = events.filter((e) => e.col === ci && e.hour === h);
                return (
                  <div
                    key={c}
                    ref={(el: HTMLDivElement | null) => { if (cellRefs.current) cellRefs.current[i] = el; }}
                    className={`${styles.cell} ${ci === todayCol ? styles.isToday : ""}`}
                    role="gridcell"
                    tabIndex={i === focus ? 0 : -1}
                    aria-label={`${h}:00 ${here.map((e) => e.title).join(" ")}`.trim()}
                    onKeyDown={(e: KeyEvt) => onKeyDown(i, e)}
                  >
                    {here.map((e, k) => (
                      <span
                        key={`${e.title}-${k}`}
                        className={[
                          styles.ev,
                          e.tone === "b" ? styles.evB : "",
                          e.half === "l" ? styles.evL : "",
                          e.half === "r" ? styles.evR : "",
                        ].join(" ")}
                        style={{ "--n": e.span } as Vars}
                      >
                        {e.title}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className={styles.now} aria-hidden="true"><i className={styles.dot} /></div>
      </div>
    </div>
  );
}
