import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StatCards.module.scss";

export type StatCardsProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Period = "week" | "month";

const CARDS: { label: string; week: string; month: string; path: string }[] = [
  { label: "방문자", week: "4,210", month: "16,940", path: "M2 18 L12 14 L22 16 L32 8 L42 10 L50 4 L58 6" },
  { label: "전환율", week: "3.2%", month: "3.6%", path: "M2 8 L12 10 L22 6 L32 12 L42 9 L50 14 L58 11" },
  { label: "매출", week: "₩842만", month: "₩3,180만", path: "M2 20 L12 16 L22 17 L32 11 L42 7 L50 9 L58 3" },
];

export default function StatCards({ duration = 220, easing = "ease-out", color = "#2f6df6" }: StatCardsProps) {
  const [period, setPeriod] = useState<Period>("week");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.sc} style={vars} role="group" aria-label="핵심 지표">
      <div className={styles.head}>
        <span className={styles.title}>이번 주</span>
        <div className={styles.switch} role="group" aria-label="기간">
          {(["week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              className={period === p ? styles.active : undefined}
              onClick={() => setPeriod(p)}
            >
              {p === "week" ? "주간" : "월간"}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.row}>
        {CARDS.map((c) => (
          <div className={styles.card} key={c.label}>
            <span className={styles.label}>{c.label}</span>
            <span className={styles.value}>{period === "week" ? c.week : c.month}</span>
            <svg className={styles.spark} viewBox="0 0 60 24" aria-hidden="true">
              <path pathLength={100} d={c.path} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
