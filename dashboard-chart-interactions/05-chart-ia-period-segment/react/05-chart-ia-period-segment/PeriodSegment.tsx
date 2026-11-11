import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./PeriodSegment.module.scss";

export type PeriodSegmentProps = {
  title?: string;
  avgLabel?: string;
  maxLabel?: string;
  unit?: string;
  tabs?: string[];
  hint?: string;
  chartLabel?: string;
  periodGroupLabel?: string;
  live7?: string;
  live30?: string;
  live90?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

// ambient 타입이 빈약해 이벤트는 파일 안 로컬 타입으로만 다룬다
type KeyEvt = { key: string; preventDefault(): void };

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

// 표와 같은 여덟 값 — 높이는 ÷5 (세로 축 상한 500명)
const COLS = [312, 268, 401, 355, 289, 430, 372, 317];
const D7 = COLS.map((v) => v / 5);
const D30 = [258, 296, 221, 340, 372, 305, 264, 288].map((v) => v / 5);
const D90 = [198, 235, 262, 214, 289, 246, 310, 270].map((v) => v / 5);
const SETS = [D7, D30, D90];
// 평균·최대 — 표의 값에서 직접 계산해 소수를 버린다 (2744/8 · 2344/8 · 2024/8)
const AVG = [343, 293, 253];
const MAX = [430, 372, 310];
const KEYS = ["7", "30", "90"];

export default function PeriodSegment({
  title = "기간별 방문",
  avgLabel = "평균",
  maxLabel = "최고",
  unit = "명",
  tabs = ["최근 7일", "최근 30일", "최근 90일"],
  hint = "기간을 고르면 같은 8칸이 새 값으로 흘러갑니다",
  chartLabel = "8구간 방문 막대. 7일 평균 343명, 최고 430명",
  periodGroupLabel = "기간 고르기",
  live7 = "7일 평균 343명, 최고 430명",
  live30 = "30일 평균 293명, 최고 372명",
  live90 = "90일 평균 253명, 최고 310명",
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: PeriodSegmentProps) {
  const [demo, setDemo] = useState(true);
  const [cur, setCur] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const live = [live7, live30, live90][cur];

  function pick(i: number) {
    setDemo(false);
    setCur(((i % 3) + 3) % 3);
  }
  function onKey(e: KeyEvt, i: number) {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pick(i + d);
  }

  return (
    <div
      className={`${styles.pg} ${demo ? styles.isDemo : ""}`}
      data-period={KEYS[cur]}
      style={vars}
    >
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sum}>
          <span className={styles.k}>{avgLabel}</span>
          <span className={styles.nAvg} aria-hidden="true" />
          <span className={styles.u}>{unit}</span>
          <span className={styles.slash} aria-hidden="true">/</span>
          <span className={styles.k}>{maxLabel}</span>
          <span className={styles.nMax} aria-hidden="true" />
          <span className={styles.u}>{unit}</span>
        </span>
      </div>

      <div className={styles.seg} role="tablist" aria-label={periodGroupLabel}>
        <span className={styles.ind} aria-hidden="true" />
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            className={styles.tab}
            aria-selected={cur === i}
            tabIndex={cur === i ? 0 : -1}
            onClick={() => pick(i)}
            onKeyDown={(e: KeyEvt) => onKey(e, i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.plot} role="img" aria-label={chartLabel}>
        {SETS[cur].map((h, i) => (
          <span key={i} className={styles.bar} style={{ "--h": `${h}%` } as CSSProperties} />
        ))}
      </div>

      <p className={styles.hint}>{hint}</p>

      <div className={styles.sr}>
        <span aria-live="polite">{live}</span>
        <table>
          <caption>8구간 방문자 수</caption>
          <thead>
            <tr><th>구간</th><th>7일</th><th>30일</th><th>90일</th></tr>
          </thead>
          <tbody>
            {COLS.map((v, i) => (
              <tr key={i}>
                <th>{i + 1}</th>
                <td>{v}</td>
                <td>{Math.round(D30[i] * 5)}</td>
                <td>{Math.round(D90[i] * 5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
