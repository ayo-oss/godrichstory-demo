import { CSSProperties } from "react";
import styles from "./CircleArrowHover.module.scss";

export interface CircleArrowHoverProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function CircleArrowHover({
  duration = "280ms",
  easing = "cubic-bezier(.34, 1.56, .64, 1)",
  color = "#2f6df6",
}: CircleArrowHoverProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <a className={styles.btn} href="#" aria-label="Next" style={style}>
      <span className={`${styles.arrow} ${styles.a}`} />
      <span className={`${styles.arrow} ${styles.b}`} />
      <span className={`${styles.trail} ${styles.trailA}`} aria-hidden="true" />
      <span className={`${styles.trail} ${styles.trailB}`} aria-hidden="true" />
    </a>
  );
}
