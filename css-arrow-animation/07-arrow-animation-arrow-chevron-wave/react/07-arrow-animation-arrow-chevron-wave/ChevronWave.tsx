import { CSSProperties } from "react";
import styles from "./ChevronWave.module.scss";

export interface ChevronWaveProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ChevronWave({
  duration = "1.5s",
  easing = "ease-out",
  color = "#fff7e6",
}: ChevronWaveProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.wave} style={style} aria-hidden="true">
      <span className={`${styles.chevron} ${styles.c1}`} />
      <span className={`${styles.chevron} ${styles.c2}`} />
      <span className={`${styles.chevron} ${styles.c3}`} />
      <span className={styles.trail} />
    </div>
  );
}
