import { CSSProperties } from "react";
import styles from "./PriceDigitFlip.module.scss";

export interface PriceDigitFlipProps {
  duration?: string;
  easing?: string;
  front?: string;
  back?: string;
}

export default function PriceDigitFlip({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  front = "$29",
  back = "$19",
}: PriceDigitFlipProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.scene} style={style}>
      <div className={styles.flip}>
        <div className={styles.inner}>
          <div className={`${styles.face} ${styles.front}`}>{front}</div>
          <div className={`${styles.face} ${styles.back}`}>{back}</div>
        </div>
      </div>
      <span className={styles.hint}>hover</span>
    </div>
  );
}
