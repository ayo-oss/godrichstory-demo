import { CSSProperties, useState } from "react";
import styles from "./PageTurn.module.scss";

export interface PageTurnProps {
  duration?: string;
  easing?: string;
  current?: string;
  next?: string;
}

export default function PageTurn({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  current = "01",
  next = "02",
}: PageTurnProps) {
  const [turned, setTurned] = useState(false);
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div
      className={styles.book}
      style={style}
      role="button"
      tabIndex={0}
      aria-pressed={turned}
      onClick={() => setTurned((v) => !v)}
      onKeyDown={(e: { key: string }) => (e.key === "Enter" || e.key === " ") && setTurned((v) => !v)}
    >
      <div className={styles.under}>{next}</div>
      <div className={`${styles.page} ${turned ? styles.turned : ""}`}>
        <div className={`${styles.face} ${styles.front}`}>{current}</div>
        <div className={`${styles.face} ${styles.back}`}>{current}</div>
      </div>
    </div>
  );
}
