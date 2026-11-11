import { CSSProperties } from "react";
import styles from "./PopularPlanLift.module.scss";

export interface PopularPlanLiftProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const SIDE = [
  { tag: "Basic", price: "$9" },
  { tag: "Team", price: "$79" },
];

export default function PopularPlanLift({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
}: PopularPlanLiftProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.grid} style={style}>
      <div className={styles.card}>
        <span className={styles.tag}>{SIDE[0].tag}</span>
        <span className={styles.price}>{SIDE[0].price}</span>
      </div>
      <div className={`${styles.card} ${styles.popular}`}>
        <span className={styles.badge}>Popular</span>
        <span className={styles.tag}>Pro</span>
        <span className={styles.price}>$29</span>
      </div>
      <div className={styles.card}>
        <span className={styles.tag}>{SIDE[1].tag}</span>
        <span className={styles.price}>{SIDE[1].price}</span>
      </div>
    </div>
  );
}
