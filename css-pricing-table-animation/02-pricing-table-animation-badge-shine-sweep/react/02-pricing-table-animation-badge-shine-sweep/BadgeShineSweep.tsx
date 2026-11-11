import { CSSProperties } from "react";
import styles from "./BadgeShineSweep.module.scss";

export interface BadgeShineSweepProps {
  duration?: string;
  easing?: string;
  tag?: string;
}

export default function BadgeShineSweep({
  duration = "2.4s",
  easing = "ease-in-out",
  tag = "Popular",
}: BadgeShineSweepProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.wrap} style={style}>
      <span className={styles.badge}>{tag}</span>
      <div className={styles.card}>
        <span className={styles.tag}>Pro plan</span>
        <span className={styles.price}>$29 / mo</span>
      </div>
    </div>
  );
}
