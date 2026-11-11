import { useState, type CSSProperties } from "react";
import styles from "./RowExpandInlineDetail.module.scss";

export type OrderRow = { title: string; meta: string; lines: string[] };

export type RowExpandInlineDetailProps = {
  rows: OrderRow[];
  /** 펼침 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 캐럿·강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 클릭한 행의 인덱스를 열림 상태로 토글. grid-template-rows 0fr→1fr 로 높이를 부드럽게 편다 */
export default function RowExpandInlineDetail({
  rows,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: RowExpandInlineDetailProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <ul className={styles.list} style={vars}>
      {rows.map((row, i) => {
        const open = openIdx === i;
        return (
          <li key={row.title} className={styles.item}>
            <button
              className={styles.head}
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
            >
              <svg className={styles.caret} style={{ transform: open ? "rotate(90deg)" : undefined }} viewBox="0 0 256 256" aria-hidden="true">
                <g fill="currentColor"><path d="m176 128l-80 80V48Z" opacity=".2" /><path d="m181.66 122.34l-80-80A8 8 0 0 0 88 48v160a8 8 0 0 0 13.66 5.66l80-80a8 8 0 0 0 0-11.32M104 188.69V67.31L164.69 128Z" /></g>
              </svg>
              <span className={styles.title}>{row.title}</span>
              <span className={styles.meta}>{row.meta}</span>
            </button>
            <div className={styles.body} style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
              <div className={styles.bodyInner} style={{ visibility: open ? "visible" : "hidden" }}>
                {row.lines.map((line) => <p key={line}>{line}</p>)}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
