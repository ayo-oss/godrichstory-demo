import { CSSProperties } from "react";
import styles from "./ReducedMotionBadge.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ReducedMotionBadgeProps {
  duration?: string;
  easing?: string;
  color?: string;
  label?: string;
}

export default function ReducedMotionBadge({
  duration = "1.6s",
  easing = "ease-out",
  color = "#2f6df6",
  label = "Generating",
}: ReducedMotionBadgeProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.badge} style={style}>
      <span className={styles.dot} />
      <span className={styles.text}>{label}</span>
    </div>
  );
}
