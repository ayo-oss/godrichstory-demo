import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ConditionalCellFormat.module.scss";

export type CellRow = { name: string; value: number };

export type ConditionalCellFormatProps = {
  gridLabel?: string;
  branchLabel?: string;
  rateLabel?: string;
  statusLabel?: string;
  bestWord?: string;
  goodWord?: string;
  watchWord?: string;
  rows?: CellRow[];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type BarVars = CSSProperties & { "--v"?: string };

const ROWS: CellRow[] = [
  { name: "Seocho", value: 72 },
  { name: "Mapo", value: 45 },
  { name: "Nowon", value: 91 },
];

export default function ConditionalCellFormat({
  gridLabel = "Attainment",
  branchLabel = "Branch",
  rateLabel = "Rate",
  statusLabel = "Status",
  bestWord = "Best",
  goodWord = "Good",
  watchWord = "Watch",
  rows = ROWS,
  demo = true,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ConditionalCellFormatProps) {
  const [data, setData] = useState<CellRow[]>(rows);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 값 하나가 구간표를 지나 등급이 되고, 등급이 배경색·막대 길이·배지를 한꺼번에 정한다
  const grade = (v: number) => (v >= 80 ? 3 : v >= 60 ? 2 : 1);
  const word = (level: number) => (level === 3 ? bestWord : level === 2 ? goodWord : watchWord);
  const barVars = (v: number): BarVars => ({ "--v": String(v / 100) });

  // 셀을 누르면 그 줄의 값이 한 단계 올라가며 등급 전체가 다시 계산된다
  const bump = (i: number) => {
    setLive(false);
    setData((prev) =>
      prev.map((r, n) => (n === i ? { name: r.name, value: r.value >= 95 ? 20 : r.value + 15 } : r))
    );
  };

  return (
    <div className={[styles.root, live ? styles.isDemo : ""].join(" ")} style={vars}>
      <div className={styles.grid} role="grid" aria-label={gridLabel}>
        <div className={[styles.row, styles.rowHead].join(" ")} role="row">
          <span role="columnheader">{branchLabel}</span>
          <span role="columnheader">{rateLabel}</span>
          <span role="columnheader">{statusLabel}</span>
        </div>
        {data.map((r, i) => {
          const level = grade(r.value);
          return (
            <div className={styles.row} role="row" key={r.name}>
              <span role="gridcell">{r.name}</span>
              <span
                className={styles.num}
                role="gridcell"
                data-level={String(level)}
                onClick={() => bump(i)}
              >
                <span className={styles.bar} style={barVars(r.value)} aria-hidden="true" />
                <i>{r.value}</i>
              </span>
              <span role="gridcell">
                <em className={styles.badge} data-level={String(level)}>{word(level)}</em>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
