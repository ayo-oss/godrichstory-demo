import { CSSProperties } from "react";
import styles from "./LiquidFill.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface LiquidFillProps {
  duration?: string;
  easing?: string;
  color?: string;
  /** 원 테두리 색 */
  frameColor?: string;
}

export default function LiquidFill({
  duration = "2s",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
  frameColor = "#17141a",
}: LiquidFillProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
    "--frame-color": frameColor,
  } as Vars & { "--frame-color"?: string };
  return (
    <div className={styles.tube} style={style} aria-hidden="true">
      <div className={styles.water} />
    </div>
  );
}
