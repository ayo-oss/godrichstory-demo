import { CSSProperties, useState } from "react";
import styles from "./UnfoldLetter.module.scss";

export interface UnfoldLetterProps {
  duration?: string;
  easing?: string;
  message?: string;
}

export default function UnfoldLetter({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  message = "YOU'RE INVITED",
}: UnfoldLetterProps) {
  const [open, setOpen] = useState(false);
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div
      className={styles.scene}
      style={style}
      role="button"
      tabIndex={0}
      aria-pressed={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e: { key: string }) => (e.key === "Enter" || e.key === " ") && setOpen((v) => !v)}
    >
      <div className={styles.letter}>{message}</div>
      <div className={`${styles.flap} ${styles.top} ${open ? styles.openTop : ""}`} />
      <div className={`${styles.flap} ${styles.bottom} ${open ? styles.openBottom : ""}`} />
    </div>
  );
}
