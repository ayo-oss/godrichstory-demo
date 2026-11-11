import type { CSSProperties } from "react";
import styles from "./PricingCandy.module.scss";

export type PricingCandyProps = {
  plans?: { name: string; price: string; per: string; pick?: boolean; badge?: string }[];
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingCandy({
  plans = [
    { name: "새싹", price: "무료", per: "영원히" },
    { name: "버블", price: "월 19,000원", per: "첫 달 무료", pick: true, badge: "인기" },
    { name: "레몬", price: "월 9,000원", per: "연간 결제" },
  ],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: PricingCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pricecandy} style={vars}>
      {plans.map((p, i) =>
        p.pick ? (
          <div key={p.name} className={`${styles.plan} ${styles.pick}`}>
            {p.badge ? <span className={styles.badge}>{p.badge}</span> : null}
            <div className={styles.inner}>
              <p className={styles.name}>{p.name}</p>
              <p className={styles.price}>{p.price}</p>
              <p className={styles.per}>{p.per}</p>
            </div>
          </div>
        ) : (
          <div key={p.name} className={`${styles.plan} ${i === 0 ? styles.mint : styles.lemon}`}>
            <p className={styles.name}>{p.name}</p>
            <p className={styles.price}>{p.price}</p>
            <p className={styles.per}>{p.per}</p>
          </div>
        )
      )}
    </div>
  );
}
