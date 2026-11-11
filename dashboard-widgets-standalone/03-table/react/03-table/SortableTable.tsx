import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./SortableTable.module.scss";

export type SortableTableProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type Key = "name" | "amount";
type Status = "ok" | "wait" | "err";
type Row = { name: string; amount: number; status: Status; statusLabel: string };

const ROWS: Row[] = [
  { name: "김도윤", amount: 128000, status: "ok", statusLabel: "완료" },
  { name: "이서준", amount: 54000, status: "wait", statusLabel: "대기" },
  { name: "박하은", amount: 212000, status: "ok", statusLabel: "완료" },
  { name: "정유나", amount: 98000, status: "err", statusLabel: "실패" },
];

export default function SortableTable({ duration = 220, easing = "ease-out", color = "#2f6df6" }: SortableTableProps) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 } | null>(null);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  const rows = useMemo(() => {
    if (!sort) return ROWS;
    const copy = [...ROWS];
    copy.sort((a, b) => {
      if (sort.key === "amount") return (a.amount - b.amount) * sort.dir;
      return a.name.localeCompare(b.name) * sort.dir;
    });
    return copy;
  }, [sort]);

  function toggle(key: Key) {
    setSort((s) => ({ key, dir: s && s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  }
  function ariaSort(key: Key): "ascending" | "descending" | "none" {
    if (!sort || sort.key !== key) return "none";
    return sort.dir === 1 ? "ascending" : "descending";
  }

  return (
    <table className={styles.tb} style={vars}>
      <thead>
        <tr>
          <th>
            <button type="button" aria-sort={ariaSort("name")} onClick={() => toggle("name")}>
              이름 <span className={styles.arrow} />
            </button>
          </th>
          <th>
            <button type="button" aria-sort={ariaSort("amount")} onClick={() => toggle("amount")}>
              금액 <span className={styles.arrow} />
            </button>
          </th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td>₩{r.amount.toLocaleString()}</td>
            <td><span className={`${styles.pill} ${styles[r.status]}`}>{r.statusLabel}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
