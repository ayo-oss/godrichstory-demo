import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StatsMetrics.module.scss";

export type StatsMetricsProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

type Stat = { target: number; label: string; decimals?: number; scale?: number; suffix?: string };
const STATS: Stat[] = [
  { target: 128400, label: "누적 방문자", suffix: "+" },
  { target: 98, label: "고객 만족도", suffix: "%" },
  { target: 1200, label: "평균 응답", decimals: 1, scale: 0.001, suffix: "초" },
];

function Counter({ target, decimals = 0, scale = 1, suffix = "", delay }: Stat & { delay: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const DUR = 1100;
    function frame(ts: number) {
      if (start === null) start = ts;
      const t = Math.max(0, ts - start - delay);
      const p = Math.min(1, t / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(eased * target * scale);
      if (p < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, scale, delay]);
  const text = (decimals ? val.toFixed(decimals) : Math.round(val)).toLocaleString("ko-KR") + suffix;
  return <span className={styles.n}>{text}</span>;
}

export default function StatsMetrics({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: StatsMetricsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <section className={styles.stats} style={vars} aria-label="핵심 지표">
      {STATS.map((s, i) => (
        <div className={styles.item} key={s.label}>
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="22" height="22">
              <g fill="currentColor">
                <path d="M232 56v64l-64-64Z" opacity=".2" />
                <path d="M232 48h-64a8 8 0 0 0-5.66 13.66L188.69 88L136 140.69l-34.34-34.35a8 8 0 0 0-11.32 0l-72 72a8 8 0 0 0 11.32 11.32L96 123.31l34.34 34.35a8 8 0 0 0 11.32 0L200 99.31l26.34 26.35A8 8 0 0 0 240 120V56a8 8 0 0 0-8-8m-8 52.69L187.31 64H224Z" />
              </g>
            </svg>
          </span>
          <p className={styles.num}><Counter {...s} delay={i * 140} /></p>
          <p className={styles.label}>{s.label}</p>
        </div>
      ))}
    </section>
  );
}
