import { CSSProperties } from "react";
import styles from "./SquishBall.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface SquishBallProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function SquishBall({
  duration = "1s",
  easing = "cubic-bezier(.45, 0, .8, .6)",
  color = "#2f6df6",
}: SquishBallProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.scene} style={style} aria-hidden="true">
      <div className={styles.ball} />
      <div className={styles.shadow} />
      <div className={styles.floor} />
    </div>
  );
}
