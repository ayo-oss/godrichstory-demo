import type { CSSProperties } from "react";
import styles from "./PricingLinear.module.scss";

export type PricingLinearProps = {
  badge?: string;
  name?: string;
  price?: string;
  cta?: string;
  /** 글로우 테두리가 숨 쉬는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingLinear({
  badge = "추천",
  name = "프로",
  price = "$19/mo",
  cta = "선택하기",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: PricingLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.plan} style={vars}>
      <span className={styles.badge}>{badge}</span>
      <p className={styles.name}>{name}</p>
      <p className={styles.price}>{price}</p>
      <button type="button" className={styles.cta}>{cta}</button>
    </section>
  );
}
