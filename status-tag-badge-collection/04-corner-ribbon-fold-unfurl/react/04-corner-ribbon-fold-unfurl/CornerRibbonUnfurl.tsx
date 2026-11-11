import type { CSSProperties } from "react";
import styles from "./CornerRibbonUnfurl.module.scss";

export type CornerRibbonUnfurlProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function CornerRibbonUnfurl({
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff6f61",
  label = "SALE",
}: CornerRibbonUnfurlProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.card} style={vars} aria-label="sale item">
      <div className={styles.thumb} />
      <div className={styles.mount}>
        <span className={styles.ribbon}>{label}</span>
      </div>
    </div>
  );
}
