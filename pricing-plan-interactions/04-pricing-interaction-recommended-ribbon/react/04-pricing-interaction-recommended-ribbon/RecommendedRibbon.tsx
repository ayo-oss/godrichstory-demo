import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RecommendedRibbon.module.scss";

export type RibbonPlan = { id: string; name: string; amount: string; picked?: boolean };
export type RecommendedRibbonProps = {
  plans?: RibbonPlan[];
  unit?: string;
  ribbon?: string;
  duration?: number;
  easing?: string;
  color?: string;
  /** 한 카드가 올라오고 다음 카드가 올라오기까지의 시차 */
  stagger?: number;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };
type CardVars = CSSProperties & { "--d"?: string };

const PLANS: RibbonPlan[] = [
  { id: "starter", name: "Starter", amount: "$9" },
  { id: "pro", name: "Pro", amount: "$29", picked: true },
  { id: "business", name: "Business", amount: "$79" },
];

export default function RecommendedRibbon({
  plans = PLANS,
  unit = "/ mo",
  ribbon = "Popular",
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
  stagger = 300,
}: RecommendedRibbonProps) {
  const [demo, setDemo] = useState(true);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  // 사람이 건드리면 자동 루프를 끈다 — 호버로 물러나고 앞으로 나오는 일은 CSS :has() 가 맡는다
  const stop = () => setDemo(false);

  return (
    <div className={`${styles.pr} ${demo ? styles.isDemo : ""}`} style={vars}>
      <div className={styles.row} onPointerEnter={stop} onFocus={stop} onClick={stop}>
        {plans.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.card} ${p.picked ? styles.picked : ""}`}
            style={{ "--d": `${i * stagger}ms` } as CardVars}
          >
            {p.picked ? <span className={styles.ribbon}>{ribbon}</span> : null}
            <span className={styles.name}>{p.name}</span>
            <span className={styles.price}>
              <span className={styles.amount}>{p.amount}</span>
              <span className={styles.unit}>{unit}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
