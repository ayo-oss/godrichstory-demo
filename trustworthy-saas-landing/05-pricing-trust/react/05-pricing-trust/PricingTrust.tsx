import type { CSSProperties } from "react";
import styles from "./PricingTrust.module.scss";

export type PricingTrustProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingTrust({ duration = 2000, easing = "ease-out", color = "#2f6df6" }: PricingTrustProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.pricing} style={vars}>
      <div className={styles.card}>
        <p className={styles.name}>스타터</p>
        <p className={styles.price}>₩0</p>
      </div>
      <div className={`${styles.card} ${styles.pro}`}>
        <span className={styles.badge}>추천</span>
        <p className={styles.name}>프로</p>
        <p className={styles.price}>₩29,000</p>
      </div>
      <div className={styles.card}>
        <p className={styles.name}>기업용</p>
        <p className={styles.price}>문의</p>
      </div>
    </div>
  );
}
