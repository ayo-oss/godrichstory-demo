import type { CSSProperties } from "react";
import styles from "./PricingChrome.module.scss";

export type PricingChromeProps = {
  freeName?: string;
  freePrice?: string;
  proName?: string;
  proPrice?: string;
  badge?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingChrome({
  freeName = "Free",
  freePrice = "$0",
  proName = "Pro",
  proPrice = "$15/mo",
  badge = "Recommended",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: PricingChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pricing} style={vars}>
      <div className={styles.plan}>
        <p className={styles.name}>{freeName}</p>
        <p className={styles.price}>{freePrice}</p>
      </div>
      <div className={`${styles.plan} ${styles.plaPro}`}>
        <span className={styles.badge}>{badge}</span>
        <p className={styles.name}>{proName}</p>
        <p className={styles.price}>{proPrice}</p>
      </div>
    </section>
  );
}
