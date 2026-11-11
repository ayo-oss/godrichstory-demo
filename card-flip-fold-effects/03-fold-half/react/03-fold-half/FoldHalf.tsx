import { CSSProperties, useState } from "react";
import styles from "./FoldHalf.module.scss";

export interface FoldHalfProps {
  duration?: string;
  easing?: string;
  label?: string;
}

export default function FoldHalf({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  label = "MENU",
}: FoldHalfProps) {
  const [folded, setFolded] = useState(false);
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div
      className={styles.card}
      style={style}
      role="button"
      tabIndex={0}
      aria-pressed={folded}
      onClick={() => setFolded((v) => !v)}
      onKeyDown={(e: { key: string }) => (e.key === "Enter" || e.key === " ") && setFolded((v) => !v)}
    >
      <div className={styles.static}>{label}</div>
      <div className={`${styles.fold} ${folded ? styles.closed : ""}`}>
        <div className={`${styles.face} ${styles.front}`}>{label}</div>
        <div className={`${styles.face} ${styles.back}`} />
      </div>
    </div>
  );
}
