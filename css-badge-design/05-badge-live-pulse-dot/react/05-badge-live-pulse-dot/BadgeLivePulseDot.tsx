import type { CSSProperties } from "react";
import styles from "./BadgeLivePulseDot.module.scss";

export type BadgeLivePulseDotProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function BadgeLivePulseDot({
  duration = 2000,
  easing = "ease-out",
  color = "#c2361a",
  label = "LIVE",
}: BadgeLivePulseDotProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <span className={styles.badge} style={vars} aria-label="live now">
      <span className={styles.dot} />
      {label}
    </span>
  );
}
