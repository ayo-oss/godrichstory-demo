import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ColumnFilterChips.module.scss";

export type ColumnFilterChipsProps = {
  tableLabel?: string;
  /** 머리글 — 앞의 두 열에만 거르기 칸이 붙는다 */
  head?: string[];
  rows?: string[][];
  /** 거르기 칸의 읽어 주는 이름 */
  filterLabels?: string[];
  /** 자동 루프에서 한 자씩 쳐 넣는 글자 */
  ghosts?: string[];
  /** 자동 재생 루프 (갤러리용). 사람이 손대면 꺼진다 */
  demo?: boolean;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type ChangeEvt = { target: { value: string } };

function FilterIcon() {
  return (
    <svg viewBox="0 0 256 256" width="1em" height="1em" fill="currentColor">
      <g>
        <path d="M221.9 61.38L152 136v58.65a8 8 0 0 1-3.56 6.66l-32 21.33A8 8 0 0 1 104 216v-80L34.1 61.38A8 8 0 0 1 40 48h176a8 8 0 0 1 5.9 13.38" opacity=".2" />
        <path d="M230.6 49.53A15.81 15.81 0 0 0 216 40H40a16 16 0 0 0-11.81 26.76l.08.09L96 139.17V216a16 16 0 0 0 24.87 13.32l32-21.34a16 16 0 0 0 7.13-13.32v-55.49l67.74-72.32l.08-.09a15.8 15.8 0 0 0 2.78-17.23m-84.42 81.05A8 8 0 0 0 144 136v58.66L112 216v-80a8 8 0 0 0-2.16-5.47L40 56h176Z" />
      </g>
    </svg>
  );
}

export default function ColumnFilterChips({
  tableLabel = "Order list",
  head = ["Name", "Status", "Qty"],
  rows = [
    ["Mina", "Done", "12"],
    ["Mint", "Waiting", "7"],
    ["Sky", "Done", "24"],
    ["Gaon", "Waiting", "5"],
  ],
  filterLabels = ["Filter by name", "Filter by status"],
  ghosts = ["mi", "done"],
  demo = true,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: ColumnFilterChipsProps) {
  const [q, setQ] = useState<string[]>(["", ""]);
  const [live, setLive] = useState(demo);

  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const cls = [styles.root, live ? styles.isDemo : ""].join(" ");

  // 열마다 따로 친 글자를 모아 한 번에 걸러 낸다
  const keeps = (row: string[]) =>
    q.every((v, c) => {
      const t = v.trim().toLowerCase();
      return !t || row[c].toLowerCase().indexOf(t) >= 0;
    });

  const onType = (c: number, value: string) => {
    setLive(false);
    setQ(q.map((v, k) => (k === c ? value : v)));
  };

  const chipText = (c: number, v: string) => `${head[c]} ${v}`;

  return (
    <div className={cls} style={vars}>
      <div className={styles.chips}>
        {live
          ? ghosts.map((g, c) => (
              <span key={c} className={[styles.chip, c === 0 ? styles.chip1 : styles.chip2].join(" ")}>
                <span className={styles.fic} aria-hidden="true">
                  <FilterIcon />
                </span>
                {chipText(c, g)}
              </span>
            ))
          : q.map((v, c) =>
              v.trim() ? (
                <span key={c} className={[styles.chip, styles.isLive].join(" ")}>
                  {chipText(c, v.trim().toLowerCase())}
                </span>
              ) : null
            )}
      </div>

      <div className={styles.grid} role="grid" aria-label={tableLabel}>
        <div className={[styles.row, styles.rowHead].join(" ")} role="row">
          {head.map((h) => (
            <span key={h} role="columnheader">
              {h}
            </span>
          ))}
        </div>
        <div className={[styles.row, styles.rowFilter].join(" ")} role="row">
          {head.map((h, c) => (
            <span className={styles.f} key={h}>
              {c < q.length ? (
                <>
                  <input
                    className={styles.input}
                    data-col={c}
                    aria-label={filterLabels[c]}
                    value={q[c]}
                    onChange={(e: ChangeEvt) => onType(c, e.target.value)}
                  />
                  <span
                    className={[styles.ghost, c === 0 ? styles.ghost1 : styles.ghost2].join(" ")}
                    aria-hidden="true"
                  >
                    {ghosts[c]}
                  </span>
                </>
              ) : null}
            </span>
          ))}
        </div>
        <div className={styles.body} role="rowgroup">
          {rows.map((row, r) => (
            <div
              className={[styles.row, keeps(row) ? "" : styles.isOut].join(" ")}
              role="row"
              key={r}
            >
              {row.map((cell, c) => (
                <span key={c} role="gridcell">
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
