import { useRef, type CSSProperties } from "react";
import styles from "./StickyHeaderColumnFreeze.module.scss";

export type StickyHeaderColumnFreezeProps = {
  columns: string[];
  rows: { label: string; values: string[] }[];
  /** 헤더·첫 열 배경 색 */
  color?: string;
};

type Vars = CSSProperties & { "--color"?: string };

export default function StickyHeaderColumnFreeze({ columns, rows, color = "#2f6df6" }: StickyHeaderColumnFreezeProps) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const vars: Vars = { "--color": color };

  const key = (e: any) => {
    const el = wrap.current;
    if (!el) return;
    const step = 24;
    if (e.key === "ArrowRight") { e.preventDefault(); el.scrollLeft += step; }
    else if (e.key === "ArrowLeft") { e.preventDefault(); el.scrollLeft -= step; }
    else if (e.key === "ArrowDown") { e.preventDefault(); el.scrollTop += step; }
    else if (e.key === "ArrowUp") { e.preventDefault(); el.scrollTop -= step; }
  };

  return (
    <div
      className={styles.wrap}
      style={vars}
      ref={wrap}
      tabIndex={0}
      aria-label="가격 비교표. 화살표 키나 드래그로 스크롤"
      onKeyDown={key}
    >
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.corner}>플랜</th>
            {columns.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {r.values.map((v, i) => <td key={i}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
