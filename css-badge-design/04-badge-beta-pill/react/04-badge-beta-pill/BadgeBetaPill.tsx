import type { CSSProperties } from "react";
import styles from "./BadgeBetaPill.module.scss";

export type BadgeBetaPillProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function BadgeBetaPill({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  label = "BETA",
}: BadgeBetaPillProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <span className={styles.pill} style={vars} aria-label="beta feature">
      <span className={styles.glow} />
      <span className={styles.text}>{label}</span>
    </span>
  );
}
