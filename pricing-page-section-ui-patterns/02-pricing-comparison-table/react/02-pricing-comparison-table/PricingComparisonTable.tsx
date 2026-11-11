// PricingComparisonTable — vanilla 판(run/339/demo/02-pricing-comparison-table/index.html) 의 React 포트.
// 플랜 세 줄의 값을 서로 대조해 실제로 다른 줄의 개수(diffCount)를 세고, 그 개수를 전체 줄 수로
// 나눈 비율로 강조 배경의 알파를 다시 계산한다(계산 한 겹).
import { useEffect, useRef } from "react";
import styles from "./PricingComparisonTable.module.scss";

export type PricingComparisonTableProps = {
  duration?: string;
  easing?: string;
  color?: string;
};

const HINT = "플랜끼리 값이 다른 줄만 세어 강조 정도를 다시 계산합니다";
const CAPTION = "플랜 비교";

type RowKey = "storage" | "seats" | "support" | "api" | "sso";

const ROW_LABELS: { key: RowKey; label: string }[] = [
  { key: "storage", label: "저장공간" },
  { key: "seats", label: "팀원 수" },
  { key: "support", label: "고객지원" },
  { key: "api", label: "API 접근" },
  { key: "sso", label: "SSO 로그인" }
];

type Scenario = Record<RowKey, string[]>;

const SCENARIOS: Scenario[] = [
  { storage: ["5GB", "50GB", "500GB"], seats: ["1", "10", "∞"], support: ["이메일", "우선", "전담"], api: ["X", "O", "O"], sso: ["X", "X", "O"] },
  { storage: ["5GB", "50GB", "500GB"], seats: ["10", "10", "10"], support: ["우선", "우선", "우선"], api: ["X", "O", "O"], sso: ["X", "X", "O"] },
  { storage: ["5GB", "50GB", "500GB"], seats: ["10", "10", "10"], support: ["우선", "우선", "우선"], api: ["O", "O", "O"], sso: ["X", "X", "X"] }
];

const ROW_KEYS: RowKey[] = ["storage", "seats", "support", "api", "sso"];

function allEqual(arr: string[]): boolean {
  return arr.every((v) => v === arr[0]);
}

export default function PricingComparisonTable({
  duration = "300ms",
  easing = "ease-out",
  color = "#17141a"
}: PricingComparisonTableProps) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const chipRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function apply(scenario: Scenario): void {
      let diffCount = 0;
      ROW_KEYS.forEach((key) => {
        const values = scenario[key];
        const tr = rowRefs.current![key];
        if (!tr) return;
        const cells = tr.querySelectorAll("." + styles.v);
        cells.forEach((cell, i) => {
          cell.textContent = values[i];
        });
        const differs = !allEqual(values);
        if (differs) diffCount += 1;
        tr.classList.toggle(styles.isDiff, differs);
        tr.style.setProperty("--diff-alpha", differs ? String(0.12 + (diffCount / ROW_KEYS.length) * 0.35) : "0");
      });
      chip!.textContent = "차이 나는 줄 " + diffCount + "/" + ROW_KEYS.length;
    }

    apply(SCENARIOS[0]);

    let timer = 0;
    if (!reduce) {
      let idx = 0;
      timer = window.setInterval(() => {
        idx = (idx + 1) % SCENARIOS.length;
        apply(SCENARIOS[idx]);
      }, 900);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className={styles.stage}>
      <section className={styles.panel}>
        <p className={styles.hint}>{HINT}</p>
        <table className={styles.cmp}>
          <caption className={styles.cmpCaption}>{CAPTION}</caption>
          <thead>
            <tr>
              <th scope="col">기능</th>
              <th scope="col">Basic</th>
              <th scope="col">Pro</th>
              <th scope="col">Team</th>
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((row) => (
              <tr
                key={row.key}
                ref={(el: HTMLTableRowElement | null) => {
                  rowRefs.current![row.key] = el;
                }}
              >
                <th scope="row">{row.label}</th>
                <td className={styles.v} />
                <td className={styles.v} />
                <td className={styles.v} />
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.chip} ref={chipRef}>
          차이 나는 줄 0/5
        </p>
      </section>
    </main>
  );
}
