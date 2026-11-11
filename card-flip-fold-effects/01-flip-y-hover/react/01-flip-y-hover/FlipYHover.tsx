import { CSSProperties } from "react";
import styles from "./FlipYHover.module.scss";

export interface FlipYHoverProps {
  duration?: string;
  easing?: string;
  front?: string;
  back?: string;
}

export default function FlipYHover({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  front = "FRONT",
  back = "BACK",
}: FlipYHoverProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.card} style={style}>
      <div className={styles.inner}>
        <div className={`${styles.face} ${styles.front}`}>{front}</div>
        <div className={`${styles.face} ${styles.back}`}>{back}</div>
      </div>
    </div>
  );
}
