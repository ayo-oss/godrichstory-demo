import { CSSProperties } from "react";
import styles from "./CubeStack.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface CubeStackProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function CubeStack({
  duration = "2s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#b9a0ff",
}: CubeStackProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`${styles.cell} ${styles["d" + i]}`}>
          <span className={styles.cube} />
        </span>
      ))}
    </div>
  );
}
