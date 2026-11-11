import type { CSSProperties } from "react";
import styles from "./BadgeLimitedStock.module.scss";

export type BadgeLimitedStockProps = {
  duration?: number;
  easing?: string;
  color?: string;
  left?: number;
};

export default function BadgeLimitedStock({
  duration = 2000,
  easing = "ease-out",
  color = "#16a34a",
  left = 3,
}: BadgeLimitedStockProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.badge} style={vars} aria-label={`${left} left in stock`}>
      <span className={styles.label}>{left} LEFT</span>
      <span className={styles.track}>
        <span className={styles.fill} />
      </span>
    </div>
  );
}
