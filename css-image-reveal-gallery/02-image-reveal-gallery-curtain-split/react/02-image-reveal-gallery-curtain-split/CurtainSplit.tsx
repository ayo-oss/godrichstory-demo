import { CSSProperties } from "react";
import styles from "./CurtainSplit.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CurtainSplitProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function CurtainSplit({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#17141a",
}: CurtainSplitProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.frame} style={style}>
      <div className={styles.photo} />
      <div className={`${styles.panel} ${styles.panelL}`} />
      <div className={`${styles.panel} ${styles.panelR}`} />
    </div>
  );
}
