import { CSSProperties } from "react";
import styles from "./LoopingSlideArrow.module.scss";

export interface LoopingSlideArrowProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function LoopingSlideArrow({
  duration = "1.6s",
  easing = "ease-out",
  color = "#17141a",
}: LoopingSlideArrowProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.row} style={style} aria-hidden="true">
      <span className={`${styles.chevron} ${styles.c1}`} />
      <span className={`${styles.chevron} ${styles.c2}`} />
      <span className={`${styles.chevron} ${styles.c3}`} />
      <span className={styles.trail} />
    </div>
  );
}
