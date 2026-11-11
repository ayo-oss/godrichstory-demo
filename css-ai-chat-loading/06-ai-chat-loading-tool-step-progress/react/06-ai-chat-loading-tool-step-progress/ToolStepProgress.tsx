import { CSSProperties } from "react";
import styles from "./ToolStepProgress.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ToolStepProgressProps {
  duration?: string;
  easing?: string;
  color?: string;
  steps?: string[];
}

const Check = () => (
  <svg viewBox="0 0 16 16">
    <path d="M3 8.5l3 3 7-7" />
  </svg>
);

export default function ToolStepProgress({
  duration = "2s",
  easing = "ease-out",
  color = "#17141a",
  steps = ["Searching web", "Reading page", "Writing answer"],
}: ToolStepProgressProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.list} style={style}>
      <div className={styles.step}>
        <span className={`${styles.icon} ${styles.icon1}`}><Check /></span>
        <span className={styles.label}>{steps[0]}</span>
      </div>
      <span className={`${styles.line} ${styles.line1}`} />
      <div className={styles.step}>
        <span className={`${styles.icon} ${styles.icon2}`}><Check /></span>
        <span className={styles.label}>{steps[1]}</span>
      </div>
      <span className={`${styles.line} ${styles.line2}`} />
      <div className={styles.step}>
        <span className={`${styles.icon} ${styles.icon3}`}><Check /></span>
        <span className={styles.label}>{steps[2]}</span>
      </div>
    </div>
  );
}
