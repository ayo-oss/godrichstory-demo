import { CSSProperties } from "react";
import styles from "./CircleMaskGrow.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CircleMaskGrowProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function CircleMaskGrow({
  duration = "550ms",
  easing = "ease-out",
  color = "#fff7e6",
}: CircleMaskGrowProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.frame} style={style}>
      <div className={styles.photo} />
    </div>
  );
}
