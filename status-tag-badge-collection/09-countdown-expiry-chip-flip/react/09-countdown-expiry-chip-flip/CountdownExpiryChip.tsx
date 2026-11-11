import type { CSSProperties } from "react";
import styles from "./CountdownExpiryChip.module.scss";

export type CountdownExpiryChipProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

const DIGITS = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "0"];

export default function CountdownExpiryChip({
  duration = 2000,
  easing = "steps(10)",
  color = "#ff4d1f",
}: CountdownExpiryChipProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={styles.chip} style={vars} aria-label="expires in 12 minutes">
      <svg viewBox="0 0 256 256" width={16} height={16} aria-hidden="true">
        <g fill="currentColor">
          <path d="M188.82,82,128,128,67.2,82.4A8,8,0,0,1,64,76V40a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8V75.64A8,8,0,0,1,188.82,82ZM64,180v36a8,8,0,0,0,8,8H184a8,8,0,0,0,8-8V180.36a8,8,0,0,0-3.18-6.38L128,128,67.2,173.6A8,8,0,0,0,64,180Z" opacity=".2" />
          <path d="M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64ZM184,216H72V180l56-42,56,42.35Zm0-140.36L128,118,72,76V40H184Z" />
        </g>
      </svg>
      <span className={styles.label}>Ends in 00:1</span>
      <span className={styles.digit} aria-hidden="true">
        <span className={styles.track}>
          {DIGITS.map((d) => <span key={d}>{d}</span>)}
        </span>
      </span>
      <span className={styles.srOnly}>12 minutes left</span>
    </div>
  );
}
