import type { CSSProperties, ReactNode } from "react";
import styles from "./PricingCollage.module.scss";

export type PricingCollagePlan = { tier: string; price: string; note: string };
export type PricingCollageProps = {
  base?: PricingCollagePlan;
  pick?: PricingCollagePlan;
  stampIcon?: ReactNode;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingCollage({
  base = { tier: "BASIC", price: "₩0", note: "부품 3개" },
  pick = { tier: "STUDIO", price: "₩9", note: "부품 9개 + zip" },
  stampIcon,
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#d93a1e",
}: PricingCollageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.pcol} style={vars}>
      <article className={`${styles.plan} ${styles.planBase}`}>
        <p className={styles.tier}>{base.tier}</p>
        <p className={styles.price}>{base.price}</p>
        <p className={styles.note}>{base.note}</p>
      </article>
      <article className={`${styles.plan} ${styles.planPick}`}>
        <span className={styles.stamp} aria-hidden="true">{stampIcon}</span>
        <p className={styles.tier}>{pick.tier}</p>
        <p className={styles.price}>{pick.price}</p>
        <p className={styles.note}>{pick.note}</p>
      </article>
    </section>
  );
}
