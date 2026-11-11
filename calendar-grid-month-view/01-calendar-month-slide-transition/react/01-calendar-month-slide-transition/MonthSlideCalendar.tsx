import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./MonthSlideCalendar.module.scss";

export type MonthSlideCalendarProps = {
  /** 시작 달 (기본: 오늘) */
  initialMonth?: Date;
  /** 슬라이드 시간(ms) */
  duration?: number;
  easing?: string;
  color?: string;
  dayNames?: string[];
  prevLabel?: string;
  nextLabel?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault: () => void };

const BASE = -100 / 3;

function pad(n: number) {
  return (n < 10 ? "0" : "") + n;
}
function label(d: Date) {
  return d.getFullYear() + ". " + (d.getMonth() + 1);
}
/** 한 달을 5주 × 7일 = 35칸으로. 6행은 좁은 폭에서 넘친다 */
function monthCells(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const off = 1 - new Date(y, m, 1).getDay();
  const out: { date: Date; outside: boolean }[] = [];
  for (let i = 0; i < 35; i++) {
    const t = new Date(y, m, off + i);
    out.push({ date: t, outside: t.getMonth() !== m });
  }
  return out;
}

export default function MonthSlideCalendar({
  initialMonth,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  dayNames = ["S", "M", "T", "W", "T", "F", "S"],
  prevLabel = "Previous month",
  nextLabel = "Next month",
}: MonthSlideCalendarProps) {
  const first = initialMonth ?? new Date();
  const [cur, setCur] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const [shift, setShift] = useState(0); // -1 · 0 · +1 트랙 오프셋
  const [animating, setAnimating] = useState(false);
  const [focused, setFocused] = useState(16);
  const busy = useRef(false);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const months = [-1, 0, 1].map((k) => new Date(cur.getFullYear(), cur.getMonth() + k, 1));

  function go(dir: number) {
    if (busy.current) return;
    busy.current = true;
    setAnimating(true);
    setShift(dir);
    window.setTimeout(() => {
      // 전환이 끝나면 들어온 달이 유일한 트랙이 된다. 리셋은 transition 이 꺼진 프레임에
      setAnimating(false);
      setShift(0);
      setCur((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
      busy.current = false;
    }, duration);
  }

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

  const offset = `translateX(${BASE - shift * (100 / 3)}%)`;
  const trackStyle: CSSProperties = { transform: offset };

  return (
    <div className={styles.cal} style={vars}>
      <span className={styles.sr} aria-live="polite">{label(cur)}</span>
      <div className={styles.bar}>
        <button type="button" className={styles.nav} aria-label={prevLabel} onClick={() => go(-1)}>
          <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
            <g fill="currentColor">
              <path d="M160 48v160l-80-80Z" opacity=".2" />
              <path d="M163.06 40.61a8 8 0 0 0-8.72 1.73l-80 80a8 8 0 0 0 0 11.32l80 80A8 8 0 0 0 168 208V48a8 8 0 0 0-4.94-7.39M152 188.69L91.31 128L152 67.31Z" />
            </g>
          </svg>
        </button>
        <div className={styles.titles} aria-hidden="true">
          <div className={`${styles.titlestrip} ${animating ? styles.isAnim : ""}`} style={trackStyle}>
            {months.map((m) => (
              <span key={m.getTime()} className={styles.t}>{label(m)}</span>
            ))}
          </div>
        </div>
        <button type="button" className={styles.nav} aria-label={nextLabel} onClick={() => go(1)}>
          <svg viewBox="0 0 256 256" width="14" height="14" aria-hidden="true">
            <g fill="currentColor">
              <path d="m176 128l-80 80V48Z" opacity=".2" />
              <path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" />
            </g>
          </svg>
        </button>
      </div>
      <div className={styles.dows} aria-hidden="true">
        {dayNames.map((d, i) => <span key={`${d}-${i}`}>{d}</span>)}
      </div>
      <div className={styles.viewport}>
        <div className={`${styles.track} ${animating ? styles.isAnim : ""}`} style={trackStyle}>
          {months.map((m, mi) => (
            <div key={m.getTime()} className={styles.month} role="grid" aria-label={label(m)}>
              {[0, 1, 2, 3, 4].map((w) => (
                <div key={w} className={styles.row} role="row">
                  {monthCells(m).slice(w * 7, w * 7 + 7).map((c, i) => {
                    const n = w * 7 + i;
                    const live = mi === 1; // 가운데(현재) 달만 키보드 대상
                    return (
                      <div
                        key={c.date.getTime()}
                        ref={live ? setCell(n) : undefined}
                        className={`${styles.cell} ${c.outside ? styles.isOut : ""}`}
                        role="gridcell"
                        aria-selected={live && n === focused}
                        aria-label={`${c.date.getFullYear()}-${pad(c.date.getMonth() + 1)}-${pad(c.date.getDate())}`}
                        tabIndex={live && n === focused ? 0 : -1}
                        onClick={() => { if (live) move(n); }}
                        onKeyDown={(e: KeyEvt) => { if (live) onKeyDown(e, n); }}
                      >
                        {c.date.getDate()}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
