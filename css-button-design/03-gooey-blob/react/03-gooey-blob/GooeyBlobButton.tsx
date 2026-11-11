import type { CSSProperties } from "react";
import styles from "./GooeyBlobButton.module.scss";

export type GooeyBlobButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function GooeyBlobButton({
  duration = 300,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#7fe3c4",
  label = "담기",
}: GooeyBlobButtonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.label}>{label}</span>
    </button>
  );
}
