import type { CSSProperties } from "react";
import styles from "./GlowRunnerButton.module.scss";

export type GlowRunnerButtonProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GlowRunnerButton({
  label = "Start free trial",
  duration = 2000,
  easing = "linear",
  color = "#ff9ebb",
}: GlowRunnerButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <button type="button" className={styles.glow} style={vars}>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
