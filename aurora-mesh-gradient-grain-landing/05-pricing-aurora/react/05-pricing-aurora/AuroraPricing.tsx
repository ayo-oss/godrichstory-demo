import type { CSSProperties } from "react";
import styles from "./AuroraPricing.module.scss";

export type AuroraPricingProps = {
  freeName?: string;
  freePrice?: string;
  badge?: string;
  proName?: string;
  proPrice?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraPricing({
  freeName = "Free",
  freePrice = "$0",
  badge = "Recommended",
  proName = "Pro",
  proPrice = "$19/mo",
  duration = 2000,
  easing = "steps(4, jump-none)",
  color = "#2f6df6",
}: AuroraPricingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pricing} style={vars}>
      <div className={styles.plan}>
        <p className={styles.name}>{freeName}</p>
        <p className={styles.price}>{freePrice}</p>
      </div>
      <div className={`${styles.plan} ${styles.pro}`}>
        <span className={styles.badge}>{badge}</span>
        <p className={styles.name}>{proName}</p>
        <p className={styles.price}>{proPrice}</p>
      </div>
    </section>
  );
}
