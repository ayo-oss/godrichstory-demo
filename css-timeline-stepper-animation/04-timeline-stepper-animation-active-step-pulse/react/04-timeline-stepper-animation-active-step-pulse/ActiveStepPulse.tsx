import { CSSProperties } from "react";
import styles from "./ActiveStepPulse.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ActiveStepPulseProps {
  duration?: string;
  easing?: string;
  color?: string;
  activeNumber?: number;
}

export default function ActiveStepPulse({
  duration = "1.6s",
  easing = "ease-out",
  color = "#2f6df6",
  activeNumber = 3,
}: ActiveStepPulseProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.track} style={style}>
      <span className={`${styles.node} ${styles.done}`} />
      <span className={`${styles.line} ${styles.done}`} />
      <span className={styles.step}>
        <span className={styles.ring} />
        <span className={styles.circle}>{activeNumber}</span>
      </span>
      <span className={styles.line} />
      <span className={styles.node} />
    </div>
  );
}
