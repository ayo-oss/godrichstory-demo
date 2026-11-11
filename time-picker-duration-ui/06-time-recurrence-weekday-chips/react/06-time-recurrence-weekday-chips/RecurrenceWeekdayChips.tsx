import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecurrenceWeekdayChips.module.scss";

export type RecurrenceWeekdayChipsProps = {
  labels?: {
    cycle: string; weekly: string; monthly: string;
    days: string; abbr: string[]; full: string[]; ordinals: string[];
    at: string; none: string;
  };
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type KeyEvt = { key: string; preventDefault(): void };

const DEMO_CUTS = [
  [1, 3, 5],
  [1, 3, 4, 5],
  [1, 2, 3, 4, 5],
];

export default function RecurrenceWeekdayChips({
  labels = {
    cycle: "Repeat cycle",
    weekly: "Weekly",
    monthly: "Monthly",
    days: "Repeat days",
    abbr: ["S", "M", "T", "W", "T", "F", "S"],
    full: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    ordinals: ["1st", "2nd", "3rd", "4th", "5th"],
    at: "at 9:00 AM",
    none: "no days selected",
  },
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: RecurrenceWeekdayChipsProps) {
  const [demo, setDemo] = useState(true);
  const [monthly, setMonthly] = useState(false);
  const [picked, setPicked] = useState<number[]>([1, 3, 5]);
  const vars: Vars = { "--duration": duration + "ms", "--easing": easing, "--color": color };

  // 매월 모드의 몇째 주는 실제로 센다 — 기준일에서 그 요일이 처음 오는 날짜로 주차를 구한다
  function ordinal(w: number): string {
    const d = new Date(2026, 8, 12);
    d.setDate(d.getDate() + ((w - d.getDay() + 7) % 7));
    return labels.ordinals[Math.ceil(d.getDate() / 7) - 1];
  }
  function sentence(mode: boolean, p: number[]): string {
    const head = mode ? labels.monthly : labels.weekly;
    if (!p.length) return head + " — " + labels.none;
    if (mode) return head + " on the " + ordinal(p[0]) + " " + labels.full[p[0]] + " " + labels.at;
    if (p.length === 1) return head + " on " + labels.full[p[0]] + " " + labels.at;
    return head + " on " + p.map((w) => labels.full[w].slice(0, 3)).join(", ") + " " + labels.at;
  }
  function wake() { setDemo(false); }
  function toggle(w: number) {
    wake();
    setPicked((p) => (p.indexOf(w) < 0 ? p.concat([w]).sort((x, y) => x - y) : p.filter((x) => x !== w)));
  }
  function segKey(e: KeyEvt) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    wake();
    setMonthly((m) => !m);
  }

  const cuts = [
    sentence(false, DEMO_CUTS[0]),
    sentence(false, DEMO_CUTS[1]),
    sentence(false, DEMO_CUTS[2]),
    sentence(true, [1]),
  ];

  return (
    <div className={styles.rc + (demo ? " " + styles.isDemo : "")} style={vars}>
      <div className={styles.seg} data-m={monthly ? "m" : "w"} role="radiogroup"
           aria-label={labels.cycle} onKeyDown={segKey}>
        <span className={styles.ind} aria-hidden="true" />
        <button className={styles.opt} type="button" role="radio" data-m="w"
                aria-checked={!monthly} onClick={() => { wake(); setMonthly(false); }}>
          {labels.weekly}
        </button>
        <button className={styles.opt} type="button" role="radio" data-m="m"
                aria-checked={monthly} onClick={() => { wake(); setMonthly(true); }}>
          {labels.monthly}
        </button>
      </div>

      <div className={styles.days} role="group" aria-label={labels.days}>
        {labels.abbr.map((a, w) => (
          <button key={w} className={styles.chip} type="button" role="checkbox" data-w={w}
                  aria-checked={picked.indexOf(w) >= 0} aria-label={labels.full[w]}
                  onClick={() => toggle(w)}>
            {a}
          </button>
        ))}
      </div>

      <p className={styles.sum} aria-live="polite">
        <span className={styles.cut} data-k="1">{demo ? cuts[0] : sentence(monthly, picked)}</span>
        <span className={styles.cut} data-k="2" aria-hidden="true">{cuts[1]}</span>
        <span className={styles.cut} data-k="3" aria-hidden="true">{cuts[2]}</span>
        <span className={styles.cut} data-k="4" aria-hidden="true">{cuts[3]}</span>
      </p>
    </div>
  );
}
