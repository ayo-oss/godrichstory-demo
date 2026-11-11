import { CSSProperties } from "react";
import styles from "./CandyRing.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CandyRingProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function CandyRing({
  duration = "1s",
  easing = "ease-out",
  color = "#ff9ebb",
}: CandyRingProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={`${styles.wrap} ${styles.demo}`} style={style} aria-hidden="true">
      <div className={styles.ring} />
    </div>
  );
}
