import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SummaryCounterBars.module.scss";

export type SummaryCounterBarsProps = {
  groupLabel?: string;
  chartLabel?: string;
  heading?: string;
  recountLabel?: string;
  unitLabel?: string;
  hours?: string[];
  bars?: number[]; // 0~1 비율
  startCount?: number;
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** useRef 의 로컬 타입 — ambient 의 useRef<T> 는 { current: T | null } 를 돌려준다 */
type RafBox = { current: number | null };

function PulseIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="m96 40l33.52 88H56Zm104 88h-70.48L160 208Z" opacity=".2" />
        <path d="M240 128a8 8 0 0 1-8 8h-27.06l-37.78 75.58A8 8 0 0 1 160 216h-.4a8 8 0 0 1-7.08-5.14L95.35 60.76l-32.07 70.55A8 8 0 0 1 56 136H24a8 8 0 0 1 0-16h26.85l37.87-83.31a8 8 0 0 1 14.76.46l57.51 151l31.85-63.71A8 8 0 0 1 200 120h32a8 8 0 0 1 8 8" />
      </g>
    </svg>
  );
}

const DEFAULT_HOURS = ["09", "10", "11", "12", "13", "14"];
const DEFAULT_BARS = [0.3, 0.55, 1, 0.8, 0.45, 0.65];

export default function SummaryCounterBars({
  groupLabel = "Today's activity summary",
  chartLabel = "Activity bars by hour — 9am to 2pm",
  heading = "Today's activity",
  recountLabel = "Recount",
  unitLabel = " activities so far",
  hours = DEFAULT_HOURS,
  bars = DEFAULT_BARS,
  startCount = 12,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: SummaryCounterBarsProps) {
  const [live, setLive] = useState(demo);
  const [count, setCount] = useState(startCount);
  const [fracs, setFracs] = useState<number[]>(bars);
  const [up, setUp] = useState(false);
  const rafBox: RafBox = useRef<number | null>(null);

  // 언마운트 대기 중인 rAF 정리
  useEffect(() => () => { if (rafBox.current !== null) cancelAnimationFrame(rafBox.current); }, []);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  function recount() {
    setLive(false);
    const from = count;
    const to = count + 1;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 400);
      setCount(Math.round(from + (to - from) * p));
      if (p < 1) {
        rafBox.current = requestAnimationFrame(tick);
      }
    };
    rafBox.current = requestAnimationFrame(tick);
    setFracs((f) => f.map((v, i) => (i === f.length - 1 ? 0.85 : v))); // 마지막 막대가 실제로 자란다
    setUp(true);
  }

  const cls = [styles.sc, live ? styles.isDemo : ""].filter(Boolean).join(" ");
  const digits = ["0", "4", String(startCount)];

  return (
    <section className={cls} style={vars} aria-label={groupLabel}>
      <header className={styles.h}>
        <span className={styles.ic} aria-hidden="true"><PulseIcon /></span>
        <h2 className={styles.t}>{heading}</h2>
        <button className={styles.re} type="button" onClick={recount}>{recountLabel}</button>
      </header>
      <p className={styles.cap} aria-live="polite">
        <span className={styles.n}>
          {live ? (
            digits.map((d, i) => (
              <i key={i} className={styles[`d${"ABC"[i]}`]} aria-hidden="true">{d}</i>
            ))
          ) : (
            count
          )}
        </span>
        <span className={styles.unit}>{unitLabel}</span>
      </p>
      <div className={styles.chart} role="img" aria-label={chartLabel}>
        {fracs.map((f, i) => (
          <div key={i} className={styles.col}>
            <span className={[styles.barw, i === fracs.length - 1 && up ? styles.isUp : ""].filter(Boolean).join(" ")} style={{ "--f": f }}>
              <i className={styles.bar}></i>
            </span>
            <span className={styles.hr}>{hours[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
