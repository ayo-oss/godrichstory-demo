import { CSSProperties, useState } from "react";
import styles from "./FlipXClick.module.scss";

export interface FlipXClickProps {
  duration?: string;
  easing?: string;
  front?: string;
  back?: string;
}

export default function FlipXClick({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  front = "Q",
  back = "A",
}: FlipXClickProps) {
  const [open, setOpen] = useState(false);
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <button
      type="button"
      className={`${styles.card} ${open ? styles.flipped : ""}`}
      style={style}
      aria-pressed={open}
      onClick={() => setOpen((v) => !v)}
    >
      <span className={styles.inner}>
        <span className={`${styles.face} ${styles.front}`}>{front}</span>
        <span className={`${styles.face} ${styles.back}`}>{back}</span>
      </span>
    </button>
  );
}
