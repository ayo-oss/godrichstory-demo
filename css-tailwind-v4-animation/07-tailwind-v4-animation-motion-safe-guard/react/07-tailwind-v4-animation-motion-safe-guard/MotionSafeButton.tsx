import type { CSSProperties } from "react";
import styles from "./MotionSafeButton.module.scss";

export type MotionSafeButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function MotionSafeButton({
  label = "Save changes",
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: MotionSafeButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button type="button" className={styles.btn} style={vars}>
      {label}
    </button>
  );
}
