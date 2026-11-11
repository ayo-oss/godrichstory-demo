import { CSSProperties } from "react";
import styles from "./DoubleArrowSwap.module.scss";

export interface DoubleArrowSwapProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function DoubleArrowSwap({
  duration = "1.8s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: DoubleArrowSwapProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.wrap} style={style} aria-hidden="true">
      <span className={`${styles.arrow} ${styles.a}`} />
      <span className={`${styles.arrow} ${styles.b}`} />
      <span className={`${styles.trail} ${styles.trailA}`} />
      <span className={`${styles.trail} ${styles.trailB}`} />
    </div>
  );
}
