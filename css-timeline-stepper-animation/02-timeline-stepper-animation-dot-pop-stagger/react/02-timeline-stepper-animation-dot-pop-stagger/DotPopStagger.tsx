import { CSSProperties } from "react";
import styles from "./DotPopStagger.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface DotPopStaggerProps {
  duration?: string;
  easing?: string;
  color?: string;
  count?: number;
  stepDelay?: number;
}

export default function DotPopStagger({
  duration = "2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#17141a",
  count = 5,
  stepDelay = 140,
}: DotPopStaggerProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.row} style={style}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={styles.dot} style={{ animationDelay: `${i * stepDelay}ms` }} />
      ))}
    </div>
  );
}
