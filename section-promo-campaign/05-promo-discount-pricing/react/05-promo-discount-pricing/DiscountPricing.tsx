import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./DiscountPricing.module.scss";

export type DiscountPricingProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DiscountPricing({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: DiscountPricingProps) {
  const [yearly, setYearly] = useState(false);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.dp} style={vars}>
      <span className={styles.badge}>런칭 할인</span>
      <div className={styles.switchRow}>
        <span className={styles.switchLabel}>연간 결제</span>
        <button type="button" className={styles.switch} role="switch" aria-checked={yearly} onClick={() => setYearly((v) => !v)}>
          <span className={styles.knob} />
        </button>
      </div>
      <div className={styles.priceWrap}>
        <div className={`${styles.price} ${!yearly ? styles.active : ""}`}>
          <span className={styles.old}>₩19,000</span>
          <span className={styles.now}>₩12,900<small>/월</small></span>
        </div>
        <div className={`${styles.price} ${yearly ? styles.active : ""}`}>
          <span className={styles.old}>₩228,000</span>
          <span className={styles.now}>₩9,900<small>/월</small></span>
        </div>
      </div>
    </section>
  );
}
