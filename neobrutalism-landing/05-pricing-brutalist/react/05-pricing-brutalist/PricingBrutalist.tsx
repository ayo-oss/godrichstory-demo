import type { CSSProperties } from "react";
import styles from "./PricingBrutalist.module.scss";

export type PricingBrutalistProps = {
  baseName?: string;
  basePrice?: string;
  proName?: string;
  proPrice?: string;
  badge?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingBrutalist({
  baseName = "라이트",
  basePrice = "무료",
  proName = "프로",
  proPrice = "월 12,000원",
  badge = "추천",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: PricingBrutalistProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pricing} style={vars}>
      <div className={styles.plan}>
        <p className={styles.name}>{baseName}</p>
        <p className={styles.price}>{basePrice}</p>
      </div>
      <div className={`${styles.plan} ${styles.pro}`}>
        <span className={styles.badge} aria-hidden="true">{badge}</span>
        <p className={styles.name}>{proName}</p>
        <p className={styles.price}>{proPrice}</p>
      </div>
    </div>
  );
}
