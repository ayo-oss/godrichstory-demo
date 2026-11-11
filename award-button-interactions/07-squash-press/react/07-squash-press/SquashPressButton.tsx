import type { CSSProperties } from "react";
import styles from "./SquashPressButton.module.scss";

export type SquashPressButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SquashPressButton({
  label = "Submit",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#ff9ebb",
}: SquashPressButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.squash} style={vars}>
      {label}
    </button>
  );
}
