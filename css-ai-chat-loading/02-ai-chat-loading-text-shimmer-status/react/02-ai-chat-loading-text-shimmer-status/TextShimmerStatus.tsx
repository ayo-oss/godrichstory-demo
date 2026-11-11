import { CSSProperties } from "react";
import styles from "./TextShimmerStatus.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface TextShimmerStatusProps {
  duration?: string;
  easing?: string;
  color?: string;
  label?: string;
}

export default function TextShimmerStatus({
  duration = "1.6s",
  easing = "linear",
  color = "#17141a",
  label = "Thinking…",
}: TextShimmerStatusProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.status} style={style}>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
