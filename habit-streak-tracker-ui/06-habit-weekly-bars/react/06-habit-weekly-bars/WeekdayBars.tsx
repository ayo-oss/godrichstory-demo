// WeekdayBars — vanilla 판(run/297/demo/06-habit-weekly-bars/index.html) 의 React 포트.
// 칸은 repeat(7, 1fr) 로 균등 분할하고 막대는 아래 변에서 scaleY 로만 자란다.
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./WeekdayBars.module.scss";

export type WeekdayBarsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ColVars = CSSProperties & { "--i"?: string; "--v"?: string };

const STORE = "godrich-habit-bars";
const MAX = 5;
const GOAL = 3;
const TODAY = 4;   // 목표 3회, 오늘은 5일차(0부터 세어 4)
const TITLE = "요일별 완료 수";
const COL_LABEL = "{d}일차 {n}회";
const SAY_TEXT = "목표선을 넘은 날 {n}개";
const TODAY_TAG = "오늘";
const CAP_TEXT = "왼쪽부터 이번 주 1일차부터 7일차까지";
const START = [2, 4, 3, 1, 3, 5, 2];

export default function WeekdayBars({
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: WeekdayBarsProps) {
  const [counts, setCounts] = useState<number[]>(START);
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) { setCounts(JSON.parse(raw) as number[]); }
    } catch (e) { /* 저장소가 막힌 창에서는 기본 기록 그대로 */ }
  }, []);

  function save(next: number[]) {
    try { window.localStorage.setItem(STORE, JSON.stringify(next)); } catch (e) { /* 저장만 건너뛴다 */ }
  }
  function bump(i: number) {
    setDemo(false);
    const next = counts.map((v, k) => (k === i ? (v >= MAX ? 0 : v + 1) : v));
    setCounts(next);
    save(next);
  }

  const over = counts.filter((n) => n >= GOAL).length;
  const cls = [styles.root, demo ? styles.isDemo : ""].filter(Boolean).join(" ");
  const colVars = (i: number, n: number): ColVars => ({ "--i": String(i), "--v": String(Math.min(n / MAX, 1)) });

  return (
    <main className={styles.stage}>
      <div className={cls} style={vars}>
        <div className={styles.head}>
          <p className={styles.title}>{TITLE}</p>
          <p className={styles.say} role="status" aria-live="polite">
            {SAY_TEXT.replace("{n}", String(over))}
          </p>
        </div>
        <div className={styles.chart}>
          <span className={styles.goal} aria-hidden="true" />
          <div className={styles.cols}>
            {counts.map((n, i) => (
              <button
                className={[styles.col, i === TODAY ? styles.colToday : ""].filter(Boolean).join(" ")}
                key={i}
                type="button"
                style={colVars(i, n)}
                aria-label={COL_LABEL.replace("{d}", String(i + 1)).replace("{n}", String(n))}
                onClick={() => bump(i)}
              >
                <span className={styles.num}>{n}</span>
                <span className={styles.slot}>
                  <span className={[styles.bar, n >= GOAL ? styles.over : ""].filter(Boolean).join(" ")} />
                </span>
                <span className={[styles.tick, i === TODAY ? styles.tickToday : ""].filter(Boolean).join(" ")}>
                  {i === TODAY ? TODAY_TAG : String(i + 1)}
                </span>
              </button>
            ))}
          </div>
        </div>
        <p className={styles.cap}>{CAP_TEXT}</p>
      </div>
    </main>
  );
}
