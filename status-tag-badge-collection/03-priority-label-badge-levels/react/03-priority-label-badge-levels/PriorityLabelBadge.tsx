import type { CSSProperties } from "react";
import styles from "./PriorityLabelBadge.module.scss";

export type PriorityLabelBadgeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

export default function PriorityLabelBadge({
  duration = 2000,
  easing = "ease-out",
  color = "#c2361a",
}: PriorityLabelBadgeProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <ul className={styles.labels} style={vars} aria-label="priority list">
      <li className={`${styles.label} ${styles.low}`}>Low</li>
      <li className={`${styles.label} ${styles.medium}`}>Medium</li>
      <li className={`${styles.label} ${styles.high}`}>High</li>
      <li className={`${styles.label} ${styles.urgent}`}>
        <svg viewBox="0 0 256 256" width={12} height={12} aria-hidden="true">
          <g fill="currentColor">
            <path d="M224,56V176c-64,55.43-112-55.43-176,0V56C112,.57,160,111.43,224,56Z" opacity=".2" />
            <path d="M42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V56A8,8,0,0,0,218.76,50c-28,24.23-51.72,12.49-79.21-1.12C111.07,34.76,78.78,18.79,42.76,50ZM216,172.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V59.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z" />
          </g>
        </svg>
        Urgent
      </li>
    </ul>
  );
}
