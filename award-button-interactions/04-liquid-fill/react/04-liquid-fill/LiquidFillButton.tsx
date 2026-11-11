import type { CSSProperties } from "react";
import styles from "./LiquidFillButton.module.scss";

export type LiquidFillButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function LiquidFillButton({
  label = "Add to cart",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4cd4a6",
}: LiquidFillButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.liq} style={vars}>
      <span className={styles.wave} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
