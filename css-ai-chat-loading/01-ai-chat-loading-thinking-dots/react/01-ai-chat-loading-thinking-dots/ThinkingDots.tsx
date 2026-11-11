import { CSSProperties } from "react";
import styles from "./ThinkingDots.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ThinkingDotsProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ThinkingDots({
  duration = "1.2s",
  easing = "ease-out",
  color = "#fff7e6",
}: ThinkingDotsProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.bubble} style={style}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  );
}
