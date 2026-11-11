import type { CSSProperties } from "react";
import styles from "./PricingNeu.module.scss";

export type PricingNeuProps = {
  liteName?: string;
  liteCost?: string;
  proName?: string;
  proCost?: string;
  badge?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingNeu({
  liteName = "라이트",
  liteCost = "무료",
  proName = "프로",
  proCost = "월 12,000원",
  badge = "추천",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PricingNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.pricing} style={vars}>
      <div className={styles.plan}>
        <p className={styles.name}>{liteName}</p>
        <p className={styles.cost}>{liteCost}</p>
      </div>
      <div className={`${styles.plan} ${styles.pro}`}>
        <span className={styles.badge}>{badge}</span>
        <p className={styles.name}>{proName}</p>
        <p className={styles.cost}>{proCost}</p>
      </div>
    </div>
  );
}
