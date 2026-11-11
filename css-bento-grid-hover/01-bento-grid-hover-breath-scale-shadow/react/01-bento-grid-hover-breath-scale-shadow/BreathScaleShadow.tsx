import { CSSProperties } from "react";
import styles from "./BreathScaleShadow.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface BreathScaleShadowProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function BreathScaleShadow({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#2f6df6",
}: BreathScaleShadowProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <span className={styles.tag}>Project</span>
        <span className={styles.num}>01</span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>New</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>42%</span>
      </div>
    </div>
  );
}
