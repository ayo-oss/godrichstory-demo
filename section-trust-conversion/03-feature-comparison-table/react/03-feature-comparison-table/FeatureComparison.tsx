import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./FeatureComparison.module.scss";

export type FeatureComparisonProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ROWS: { label: string; basic: boolean; pro: boolean }[] = [
  { label: "팀원 5명까지", basic: true, pro: true },
  { label: "API 연동", basic: false, pro: true },
  { label: "우선 지원", basic: false, pro: true },
];

function Check() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16">
      <g fill="currentColor">
        <path d="M232 56v144a16 16 0 0 1-16 16H40a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h176a16 16 0 0 1 16 16" opacity=".2" />
        <path d="m205.66 85.66l-96 96a8 8 0 0 1-11.32 0l-40-40a8 8 0 0 1 11.32-11.32L104 164.69l90.34-90.35a8 8 0 0 1 11.32 11.32" />
      </g>
    </svg>
  );
}
function Cross() {
  return (
    <svg viewBox="0 0 256 256" width="16" height="16">
      <g fill="currentColor">
        <path d="M216 56v144a16 16 0 0 1-16 16H56a16 16 0 0 1-16-16V56a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16" opacity=".2" />
        <path d="M205.66 194.34a8 8 0 0 1-11.32 11.32L128 139.31l-66.34 66.35a8 8 0 0 1-11.32-11.32L116.69 128L50.34 61.66a8 8 0 0 1 11.32-11.32L128 116.69l66.34-66.35a8 8 0 0 1 11.32 11.32L139.31 128Z" />
      </g>
    </svg>
  );
}

export default function FeatureComparison({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: FeatureComparisonProps) {
  const [plan, setPlan] = useState<"basic" | "pro">("pro");
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  // 자동 재생: 1초마다 basic·pro 를 번갈아 강조 (사용자가 직접 눌러도 즉시 반영된다)
  useEffect(() => {
    const id = setInterval(() => setPlan((p) => (p === "pro" ? "basic" : "pro")), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <table className={styles.fc} style={vars}>
      <caption className={styles.srOnly}>요금제별 기능 비교</caption>
      <thead>
        <tr>
          <th scope="col" />
          {(["basic", "pro"] as const).map((p) => (
            <th scope="col" key={p}>
              <button
                type="button"
                className={`${styles.plan} ${plan === p ? styles.on : ""}`}
                aria-pressed={plan === p}
                onClick={() => setPlan(p)}
              >
                {p === "basic" ? "Basic" : "Pro"}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r) => (
          <tr key={r.label}>
            <th scope="row">{r.label}</th>
            {(["basic", "pro"] as const).map((p) => {
              const has = p === "basic" ? r.basic : r.pro;
              return (
                <td key={p} className={`${styles.cell} ${plan === p ? styles.on : ""}`}>
                  <span className={has ? styles.yes : styles.no} aria-hidden="true">{has ? <Check /> : <Cross />}</span>
                  <span className={styles.srOnly}>{has ? "있음" : "없음"}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
