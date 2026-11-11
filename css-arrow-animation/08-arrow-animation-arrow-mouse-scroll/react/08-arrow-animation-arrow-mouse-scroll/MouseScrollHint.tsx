import { CSSProperties } from "react";
import styles from "./MouseScrollHint.module.scss";

export interface MouseScrollHintProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function MouseScrollHint({
  duration = "1.6s",
  easing = "ease-out",
  color = "#17141a",
}: MouseScrollHintProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.mouse} style={style} aria-hidden="true">
      <span className={styles.dot} />
      <span className={styles.trail} />
    </div>
  );
}
