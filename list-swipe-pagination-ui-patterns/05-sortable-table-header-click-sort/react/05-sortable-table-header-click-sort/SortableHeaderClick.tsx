import { useState, type CSSProperties } from "react";
import styles from "./SortableHeaderClick.module.scss";

export type Row = { name: string; score: number };

export type SortableHeaderClickProps = {
  rows: Row[];
  /** 화살표가 뒤집히는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 정렬 중인 열 강조 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Key = "name" | "score";
type Dir = "none" | "ascending" | "descending";

export default function SortableHeaderClick({
  rows,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: SortableHeaderClickProps) {
  const [key, setKey] = useState<Key>("score");
  const [dir, setDir] = useState<Dir>("descending");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const sorted = rows.slice().sort((a, b) => {
    const cmp = a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0;
    return dir === "ascending" ? cmp : -cmp;
  });
  const click = (k: Key) => {
    setDir(k === key && dir === "ascending" ? "descending" : "ascending");
    setKey(k);
  };
  const sortOf = (k: Key): Dir => (k === key ? dir : "none");

  return (
    <table className={styles.table} style={vars}>
      <caption className={styles.caption}>참가자 점수</caption>
      <thead>
        <tr>
          <th>
            <button className={styles.th} type="button" aria-sort={sortOf("name")} onClick={() => click("name")}>
              이름<span className={styles.arrow} aria-hidden="true">▾</span>
            </button>
          </th>
          <th>
            <button className={styles.th} type="button" aria-sort={sortOf("score")} onClick={() => click("score")}>
              점수<span className={styles.arrow} aria-hidden="true">▾</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>{r.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
