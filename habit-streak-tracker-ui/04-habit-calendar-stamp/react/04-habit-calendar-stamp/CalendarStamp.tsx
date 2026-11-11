// CalendarStamp — vanilla 판(run/297/demo/04-habit-calendar-stamp/index.html) 의 React 포트.
// 한 달 칸을 role="grid" · role="row" · role="gridcell" 로 짜고 칸마다 aria-pressed 를 둔다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./CalendarStamp.module.scss";

export type CalendarStampProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CellVars = CSSProperties & { "--i"?: string };

const STORE = "godrich-habit-stamp";
const LAST_DAY = 30;
const COLS = 7;
const TITLE = "9월 습관 도장";
const GRID_LABEL = "9월 습관 도장 달력";
const DAY_LABEL = "{d}일 도장";
const SAY_TEXT = "도장 {n}개";
const START = [1, 2, 3, 5, 6, 7, 8, 11, 12, 15, 16, 17, 20, 22, 23, 26];

export default function CalendarStamp({
  duration = 2000,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
}: CalendarStampProps) {
  const [stamped, setStamped] = useState<number[]>(START);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setStamped(JSON.parse(raw) as number[]); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본 기록 그대로 */ }
  }, []);

  function save(next: number[]) {
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function has(day: number): boolean { return stamped.indexOf(day) >= 0; }
  function toggle(day: number) {
    setDemo(false);
    const next = has(day) ? stamped.filter((d) => d !== day) : stamped.concat([day]);
    setStamped(next);
    save(next);
  }

  const rows: number[][] = [];
  for (let d = 1; d <= LAST_DAY; d++) {
    if ((d - 1) % COLS === 0) { rows.push([]); }
    rows[rows.length - 1].push(d);
  }
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const cellVars = (i: number): CellVars => ({ "--i": String(i) });

  return (
    <main className={styles.stage}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="ico-check-circle" viewBox="0 0 256 256" fill="currentColor"><g><path d="M224 128a96 96 0 1 1-96-96a96 96 0 0 1 96 96" opacity=".2"/><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0M232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104m-16 0a88 88 0 1 0-88 88a88.1 88.1 0 0 0 88-88"/></g></symbol>
          <symbol id="ico-calendar-check" viewBox="0 0 256 256" fill="currentColor"><g><path d="M216 48v40H40V48a8 8 0 0 1 8-8h160a8 8 0 0 1 8 8" opacity=".2"/><path d="M208 32h-24v-8a8 8 0 0 0-16 0v8H88v-8a8 8 0 0 0-16 0v8H48a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16M72 48v8a8 8 0 0 0 16 0v-8h80v8a8 8 0 0 0 16 0v-8h24v32H48V48Zm136 160H48V96h160zm-38.34-85.66a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 164.69l42.34-42.35a8 8 0 0 1 11.32 0"/></g></symbol>
        </defs>
      </svg>
      <div className={cls} style={vars}>
        <div className={styles.head}>
          <p className={styles.title}>
            <svg className={styles.ico} aria-hidden="true"><use href="#ico-calendar-check" /></svg>
            <span>{TITLE}</span>
          </p>
          <p className={styles.say} role="status" aria-live="polite">
            {SAY_TEXT.replace("{n}", String(stamped.length))}
          </p>
        </div>
        <div className={styles.days} role="grid" aria-label={GRID_LABEL}>
          {rows.map((row, ri) => (
            <div className={styles.row} role="row" key={ri}>
              {row.map((d) => {
                const col = (d - 1) % COLS;
                const on = has(d);
                const cn = [
                  styles.cell,
                  on ? styles.on : "",
                  on && col > 0 && has(d - 1) ? styles.left : "",
                  on && col < COLS - 1 && has(d + 1) ? styles.right : "",
                ].filter(Boolean).join(" ");
                return (
                  <button
                    className={cn}
                    key={d}
                    type="button"
                    role="gridcell"
                    aria-pressed={on ? "true" : "false"}
                    aria-label={DAY_LABEL.replace("{d}", String(d))}
                    style={cellVars(d - 1)}
                    onClick={() => toggle(d)}
                  >
                    <span className={styles.n}>{d}</span>
                    <svg className={styles.stamp} aria-hidden="true"><use href="#ico-check-circle" /></svg>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
