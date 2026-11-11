import type { CSSProperties } from "react";
import styles from "./PricingCitrus.module.scss";

export type PricingCitrusProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingCitrus({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff6a00",
}: PricingCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.pricecitrus} style={vars}>
      <div className={`${styles.plan} ${styles.planLime}`}>
        <p className={styles.name}>새싹</p>
        <p className={styles.price}>무료</p>
        <p className={styles.per}>영원히</p>
      </div>
      <div className={`${styles.plan} ${styles.planPick}`}>
        <span className={styles.badge}>인기</span>
        <div className={styles.inner}>
          <p className={styles.name}>스퀴즈</p>
          <p className={styles.price}>월 19,000원</p>
          <p className={styles.per}>첫 달 무료</p>
        </div>
      </div>
      <div className={`${styles.plan} ${styles.planGrp}`}>
        <p className={styles.name}>자몽</p>
        <p className={styles.price}>월 9,000원</p>
        <p className={styles.per}>연간 결제</p>
      </div>
    </div>
  );
}
