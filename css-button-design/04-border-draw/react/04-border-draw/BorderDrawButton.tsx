import type { CSSProperties } from "react";
import styles from "./BorderDrawButton.module.scss";

export type BorderDrawButtonProps = {
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

export default function BorderDrawButton({
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
  label = "프로젝트 문의",
}: BorderDrawButtonProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <button className={styles.btn} style={vars} type="button">
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <svg className={styles.frame} viewBox="0 0 240 64" aria-hidden="true" focusable="false">
        <rect className={styles.rect} x="1.5" y="1.5" width="237" height="61" rx="12"
              pathLength="100" vector-effect="non-scaling-stroke" />
      </svg>
    </button>
  );
}
