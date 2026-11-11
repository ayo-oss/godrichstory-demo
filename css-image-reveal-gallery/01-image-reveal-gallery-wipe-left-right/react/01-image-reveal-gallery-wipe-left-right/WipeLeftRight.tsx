import { CSSProperties } from "react";
import styles from "./WipeLeftRight.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface WipeLeftRightProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function WipeLeftRight({
  duration = "600ms",
  easing = "ease-out",
  color = "#2f6df6",
}: WipeLeftRightProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.frame} style={style}>
      <div className={styles.photo} />
      <div className={styles.cover} />
    </div>
  );
}
