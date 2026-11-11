import { CSSProperties } from "react";
import styles from "./SparkleText.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface SparkleTextProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function SparkleText({
  duration = "1.3s",
  easing = "ease-out",
  color = "#2f6df6",
}: SparkleTextProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={style}>
      <h2 className={styles.title}>축하합니다!</h2>
      <span className={`${styles.star} ${styles.star1}`}>✦</span>
      <span className={`${styles.star} ${styles.star2}`}>✦</span>
      <span className={`${styles.star} ${styles.star3}`}>✦</span>
    </div>
  );
}
