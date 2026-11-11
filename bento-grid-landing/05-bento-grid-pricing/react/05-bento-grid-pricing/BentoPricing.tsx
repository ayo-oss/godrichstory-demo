import type { CSSProperties } from "react";
import styles from "./BentoPricing.module.scss";

export type BentoPricingProps = {
  basicLabel?: string;
  basicPrice?: string;
  proLabel?: string;
  proPrice?: string;
  badge?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoPricing({
  basicLabel = "Free",
  basicPrice = "$0",
  proLabel = "Pro",
  proPrice = "$19/mo",
  badge = "Recommended",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8",
}: BentoPricingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pricing} style={vars}>
      <div className={`${styles.tile} ${styles.basic}`}>
        <p className={styles.plan}>{basicLabel}</p>
        <p className={styles.price}>{basicPrice}</p>
      </div>
      <div className={`${styles.tile} ${styles.pro}`}>
        <span className={styles.badge}>{badge}</span>
        <p className={styles.plan}>{proLabel}</p>
        <p className={styles.price}>{proPrice}</p>
      </div>
    </section>
  );
}
