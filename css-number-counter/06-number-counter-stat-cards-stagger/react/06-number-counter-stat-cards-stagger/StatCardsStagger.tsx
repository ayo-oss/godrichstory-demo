import type { CSSProperties } from "react";
import styles from "./StatCardsStagger.module.scss";

export type Stat = { value: number; label: string };

export type StatCardsStaggerProps = {
  stats: [Stat, Stat, Stat];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--num-target"?: number; "--delay"?: string;
};

export default function StatCardsStagger({
  stats, duration = 2000, easing = "ease-out", color = "#17141a",
}: StatCardsStaggerProps) {
  return (
    <div className={styles.cards}>
      {stats.map((s, i) => {
        const vars: Vars = {
          "--duration": `${duration}ms`,
          "--easing": easing,
          "--color": color,
          "--num-target": s.value,
          "--delay": `${i * 150}ms`,                  // 카드마다 0.15초씩 늦게 시작
        };
        return (
          <div className={styles.card} key={s.label} style={vars}>
            <span className={styles.num} aria-hidden="true" />
            <span className={styles.sr}>{s.value.toLocaleString()}</span>
            <span className={styles.label}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
