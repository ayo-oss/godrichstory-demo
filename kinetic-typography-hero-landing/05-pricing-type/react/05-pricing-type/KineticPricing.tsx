import type { CSSProperties } from "react";
import styles from "./KineticPricing.module.scss";

export type KineticPricingProps = {
  planName?: string;
  currency?: string;
  monthly?: number;
  yearly?: number;
  suffix?: string;
  /** 월간 ↔ 연간 가격이 한 번 굴러가는 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string; "--easing"?: string; "--color"?: string;
  "--num-from"?: number; "--num-to"?: number;
};

export default function KineticPricing({
  planName = "Pro plan",
  currency = "$",
  monthly = 19,
  yearly = 190,
  suffix = "/ mo",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: KineticPricingProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`, "--easing": easing, "--color": color,
    "--num-from": monthly, "--num-to": yearly,
  };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.price}>
        <p className={styles.plan}>{planName}</p>
        <div className={styles.amount}>
          <span className={styles.currency}>{currency}</span>
          <span className={styles.num} aria-hidden="true" />
          <span className={styles.sr}>{currency}{monthly}{suffix} · {currency}{yearly}/yr</span>
        </div>
        <p className={styles.suffix}>{suffix}</p>
      </div>
    </div>
  );
}
