import { CSSProperties } from "react";
import styles from "./BounceDownward.module.scss";

export interface BounceDownwardProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function BounceDownward({
  duration = "1.4s",
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#fff7e6",
}: BounceDownwardProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <span className={styles.wrap} style={style} aria-hidden="true">
      <span className={styles.chevron} />
      <span className={styles.trail} />
    </span>
  );
}
