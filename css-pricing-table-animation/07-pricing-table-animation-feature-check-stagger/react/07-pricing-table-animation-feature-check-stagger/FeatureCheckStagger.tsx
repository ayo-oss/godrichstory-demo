import { CSSProperties } from "react";
import styles from "./FeatureCheckStagger.module.scss";

export interface FeatureCheckStaggerProps {
  duration?: string;
  easing?: string;
  features?: string[];
}

export default function FeatureCheckStagger({
  duration = "320ms",
  easing = "ease-out",
  features = ["Unlimited projects", "Priority support", "Custom domain"],
}: FeatureCheckStaggerProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.card} style={style}>
      <span className={styles.tag}>Pro plan</span>
      <ul className={styles.list}>
        {features.map((f) => (
          <li key={f} className={styles.row}>
            <span className={styles.check} />{f}
          </li>
        ))}
      </ul>
    </div>
  );
}
