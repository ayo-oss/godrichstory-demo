import type { CSSProperties } from "react";
import styles from "./LineDrawTimeline.module.scss";

export type LineDrawTimelineProps = {
  steps: string[];
  /** 선 두께 (기본 2px) */
  thickness?: number;
  /** 선·점 색 (기본 cream) */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--thickness"?: string; "--color"?: string };

export default function LineDrawTimeline({
  steps,
  thickness = 2,
  color = "#fff7e6",
  className = "",
}: LineDrawTimelineProps) {
  const vars: Vars = { "--thickness": `${thickness}px`, "--color": color };

  return (
    <ul className={`${styles.timeline} ${className}`} style={vars}>
      {steps.map((step) => (
        <li key={step} className={styles.step}>
          <span className={styles.dot} />
          {step}
        </li>
      ))}
      <li className={styles.line} aria-hidden="true" />
    </ul>
  );
}
