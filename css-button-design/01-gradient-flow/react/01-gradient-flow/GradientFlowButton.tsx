import type { CSSProperties } from "react";
import styles from "./GradientFlowButton.module.scss";

export type GradientFlowButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  candyB?: string;
  candyC?: string;
  label?: string;
};

export default function GradientFlowButton({
  duration = 2000,
  easing = "linear",
  color = "#ff9ecb",
  candyB = "#a78bfa",
  candyC = "#7cd8ff",
  label = "멤버 되기",
}: GradientFlowButtonProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--candy-b": candyB,
    "--candy-c": candyC,
  } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.bg} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </button>
  );
}
