import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./StickySummaryRow.module.scss";

export type SummaryRow = { name: string; value: number };

export type StickySummaryRowProps = {
  gridLabel?: string;
  periodLabel?: string;
  amountLabel?: string;
  totalLabel?: string;
  rows?: SummaryRow[];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROWS: SummaryRow[] = [
  { name: "Mar wk 1", value: 42 },
  { name: "Mar wk 2", value: 38 },
  { name: "Mar wk 3", value: 51 },
  { name: "Mar wk 4", value: 27 },
  { name: "Apr wk 1", value: 60 },
];

export default function StickySummaryRow({
  gridLabel = "Settlement list",
  periodLabel = "Period",
  amountLabel = "Amount",
  totalLabel = "Total",
  rows = ROWS,
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: StickySummaryRowProps) {
  const [picked, setPicked] = useState<number[]>([]);
  const [more, setMore] = useState(true);
  const [live, setLive] = useState(demo);
  const viewRef = useRef<HTMLDivElement>(null);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 고른 줄이 있으면 그것만, 없으면 전부 더한다
  const list = picked.length ? rows.filter((_r, i) => picked.indexOf(i) >= 0) : rows;
  const sum = list.reduce((n, r) => n + r.value, 0);
  // 루프에서 두 번째 줄만 골랐을 때 컷으로 갈아 끼우는 부분합
  const sample = rows.length > 1 ? rows[1].value : sum;

  // 끝까지 내려가면 그림자를 끈다
  const shade = () => {
    const el = viewRef.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  };
  useEffect(() => { shade(); }, []);

  const toggle = (i: number) => {
    setLive(false);
    setPicked((prev) => (prev.indexOf(i) >= 0 ? prev.filter((n) => n !== i) : prev.concat([i])));
  };

  const cls = [styles.root, live ? styles.isDemo : "", more ? styles.isMore : ""].join(" ");

  return (
    <div className={cls} style={vars}>
      <div className={styles.head} role="row">
        <span role="columnheader">{periodLabel}</span>
        <span role="columnheader">{amountLabel}</span>
      </div>
      <div
        className={styles.view}
        role="grid"
        aria-label={gridLabel}
        tabIndex={0}
        ref={viewRef}
        onScroll={() => { setLive(false); shade(); }}
      >
        <div className={styles.track} role="rowgroup">
          {rows.map((r, i) => (
            <button
              key={r.name}
              className={[styles.row, picked.indexOf(i) >= 0 ? styles.isPick : ""].join(" ")}
              type="button"
              role="row"
              aria-selected={picked.indexOf(i) >= 0 ? "true" : "false"}
              onClick={() => toggle(i)}
            >
              <span role="gridcell">{r.name}</span>
              <span role="gridcell">{r.value}</span>
            </button>
          ))}
        </div>
        <div className={[styles.sum, picked.length ? styles.isPart : ""].join(" ")} role="row">
          <span className={styles.sic} aria-hidden="true">
            <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
              <g>
                <path d="M192 48v160H64l64-80l-64-80Z" opacity=".2" />
                <path d="M184 72V56H80.65l53.6 67a8 8 0 0 1 0 10l-53.6 67H184v-16a8 8 0 0 1 16 0v24a8 8 0 0 1-8 8H64a8 8 0 0 1-6.25-13l60-75l-60-75A8 8 0 0 1 64 40h128a8 8 0 0 1 8 8v24a8 8 0 0 1-16 0" />
              </g>
            </svg>
          </span>
          <span className={styles.label} role="gridcell">{totalLabel}</span>
          <span className={styles.v} role="gridcell">
            <b className={styles.all}>{sum}</b>
            <b className={styles.sel}>{sample}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
