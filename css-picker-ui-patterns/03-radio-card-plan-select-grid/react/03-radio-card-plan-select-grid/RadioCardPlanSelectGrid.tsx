import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RadioCardPlanSelectGrid.module.scss";

type Plan = { id: string; icon: string; name: string; price: string };

export type RadioCardPlanSelectGridProps = {
  legend?: string;
  plans?: Plan[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--c"?: string };

const DEFAULT_PLANS: Plan[] = [
  { id: "basic", icon: "🪶", name: "Basic", price: "$0" },
  { id: "pro", icon: "🚀", name: "Pro", price: "$9" },
  { id: "team", icon: "👥", name: "Team", price: "$29" },
];

export default function RadioCardPlanSelectGrid({
  legend = "Select a plan",
  plans = DEFAULT_PLANS,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: RadioCardPlanSelectGridProps) {
  const [picked, setPicked] = useState(plans[0]?.id);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--c": color };

  return (
    <fieldset className={styles.plans} style={vars}>
      <legend className={styles.srOnly}>{legend}</legend>
      {plans.map((p) => (
        <label key={p.id} className={styles.plan} data-on={picked === p.id}>
          <input type="radio" name="plan" className={styles.radio} checked={picked === p.id}
            onChange={() => setPicked(p.id)} />
          <span className={styles.icon} aria-hidden="true">{p.icon}</span>
          <span className={styles.name}>{p.name}</span>
          <span className={styles.price}>{p.price}</span>
          <svg className={styles.badge} viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="10" />
            <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </label>
      ))}
    </fieldset>
  );
}
