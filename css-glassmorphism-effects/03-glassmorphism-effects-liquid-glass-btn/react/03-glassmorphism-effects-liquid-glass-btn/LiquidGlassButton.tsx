import { CSSProperties } from "react";
import styles from "./LiquidGlassButton.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface LiquidGlassButtonProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function LiquidGlassButton({
  duration = "600ms",
  easing = "ease-out",
  color = "#fff7e6",
}: LiquidGlassButtonProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button className={styles.btn} style={style} type="button">
      <span className={styles.label}>Get started</span>
    </button>
  );
}
