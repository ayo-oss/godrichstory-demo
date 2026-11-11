import { CSSProperties } from "react";
import styles from "./OrbitDots.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface OrbitDotsProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function OrbitDots({
  duration = "2s",
  easing = "linear",
  color = "#fff7e6",
}: OrbitDotsProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.system} style={style} aria-hidden="true">
      <span className={styles.core} />
      <span className={`${styles.dot} ${styles.dotS}`} />
      <span className={`${styles.dot} ${styles.dotM}`} />
      <span className={`${styles.dot} ${styles.dotL}`} />
    </div>
  );
}
