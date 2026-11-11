import type { CSSProperties } from "react";
import styles from "./PricingClay.module.scss";

export type PricingClayProps = {
  basicName?: string;
  basicPrice?: string;
  proName?: string;
  proPrice?: string;
  badge?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingClay({
  basicName = "라이트",
  basicPrice = "무료",
  proName = "프로",
  proPrice = "월 12,000원",
  badge = "추천",
  cta = "선택하기",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#0a4fe8",
}: PricingClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pricing} style={vars}>
      <div className={`${styles.card} ${styles.basic}`}>
        <p className={styles.name}>{basicName}</p>
        <p className={styles.price}>{basicPrice}</p>
      </div>
      <div className={`${styles.card} ${styles.pro}`}>
        <span className={styles.badge}>{badge}</span>
        <p className={styles.name}>{proName}</p>
        <p className={styles.price}>{proPrice}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </div>
  );
}
