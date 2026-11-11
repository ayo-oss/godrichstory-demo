import type { CSSProperties } from "react";
import styles from "./BadgeSoldOutOverlay.module.scss";

export type BadgeSoldOutOverlayProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function BadgeSoldOutOverlay({
  duration = 2000,
  easing = "linear",
  color = "#17141a",
  label = "SOLD OUT",
}: BadgeSoldOutOverlayProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.card} style={vars} aria-label="sold out">
      <div className={styles.thumb} />
      <div className={styles.overlay}>
        <span className={styles.stamp}>{label}</span>
      </div>
    </div>
  );
}
