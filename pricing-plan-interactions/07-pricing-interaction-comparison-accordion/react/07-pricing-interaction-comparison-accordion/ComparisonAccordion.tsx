import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ComparisonAccordion.module.scss";

export type PlanRow = { name: string; starter: string; pro: string };
export type PlanGroup = { id: string; title: string; rows: PlanRow[] };
export type ComparisonAccordionProps = {
  columns?: [string, string, string];
  groups?: PlanGroup[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const CARET = (
  <g fill="currentColor">
    <path d="m208 96l-80 80l-80-80Z" opacity=".2" />
    <path d="M215.39 92.94A8 8 0 0 0 208 88H48a8 8 0 0 0-5.66 13.66l80 80a8 8 0 0 0 11.32 0l80-80a8 8 0 0 0 1.73-8.72M128 164.69L67.31 104h121.38Z" />
  </g>
);

const DEFAULT_GROUPS: PlanGroup[] = [
  {
    id: "ca-essentials",
    title: "Essentials",
    rows: [
      { name: "Storage", starter: "10GB", pro: "1TB" },
      { name: "Team size", starter: "3 people", pro: "Unlimited" },
    ],
  },
  {
    id: "ca-security",
    title: "Security",
    rows: [
      { name: "Audit log", starter: "—", pro: "✓" },
      { name: "Two-factor login", starter: "—", pro: "✓" },
    ],
  },
];

export default function ComparisonAccordion({
  columns = ["Feature", "Starter", "Pro"],
  groups = DEFAULT_GROUPS,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: ComparisonAccordionProps) {
  const [demo, setDemo] = useState(true);
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 높이는 아무도 재지 않는다 — 칸 안쪽 상자의 grid-template-rows 가 1fr↔0fr 로 보간될 뿐이다
  function toggle(id: string) {
    setDemo(false);
    setShut((v) => ({ ...v, [id]: !v[id] }));
  }

  return (
    <div className={`${styles.ca} ${demo ? styles.isDemo : ""}`} style={vars}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headrow}>
            <th scope="col"><span className={styles.cap}>{columns[0]}</span></th>
            <th scope="col"><span className={styles.cap}>{columns[1]}</span></th>
            <th scope="col"><span className={`${styles.cap} ${styles.capHi}`}>{columns[2]}</span></th>
          </tr>
        </thead>
        {groups.map((g, gi) => (
          <tbody
            key={g.id}
            id={g.id}
            className={styles.group}
            data-g={gi === 0 ? "a" : "b"}
            data-open={shut[g.id] ? "0" : "1"}
          >
            <tr>
              <th colSpan={3} scope="colgroup" className={styles.gth}>
                <button
                  className={styles.btn}
                  type="button"
                  aria-expanded={!shut[g.id]}
                  aria-controls={g.id}
                  onClick={() => toggle(g.id)}
                >
                  <span className={styles.caret} aria-hidden="true">
                    <svg viewBox="0 0 256 256" width="16" height="16">{CARET}</svg>
                  </span>
                  <span className={styles.gname}>{g.title}</span>
                </button>
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.name} className={styles.row}>
                <th scope="row"><span className={styles.box}><span className={styles.cell}>{r.name}</span></span></th>
                <td><span className={styles.box}><span className={styles.cell}>{r.starter}</span></span></td>
                <td><span className={styles.box}><span className={`${styles.cell} ${styles.cellHi}`}>{r.pro}</span></span></td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
