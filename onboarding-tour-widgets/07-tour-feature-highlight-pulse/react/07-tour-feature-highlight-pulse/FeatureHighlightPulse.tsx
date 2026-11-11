import type { CSSProperties } from "react";
import styles from "./FeatureHighlightPulse.module.scss";

export type FeatureHighlightPulseProps = {
  duration?: number;
  easing?: string;
  color?: string;
  items?: string[];
  /** 펄스 배지를 붙일 항목의 순번 (0부터) */
  highlightIndex?: number;
  badgeLabel?: string;
};

export default function FeatureHighlightPulse({
  duration = 2000,
  easing = "ease-out",
  color = "#ff4d1f",
  items = ["Dashboard", "Automation", "Reports"],
  highlightIndex = 1,
  badgeLabel = "New feature",
}: FeatureHighlightPulseProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <ul className={styles.menu} style={vars} aria-label="Side menu">
      {items.map((label, i) =>
        i === highlightIndex ? (
          <li className={`${styles.mi} ${styles.isNew}`} key={label}>
            <span className={styles.si} aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">
                <path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" opacity="0.2" />
                <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z" />
              </svg>
            </span>
            <span className={styles.lb}>{label}</span>
            {/* 점은 absolute — 줄 안에 자리를 차지하지 않으니 링이 퍼져도 글줄이 안 밀린다 */}
            <span className={styles.dot} role="img" aria-label={badgeLabel}>
              <i className={styles.ring} aria-hidden="true" />
            </span>
          </li>
        ) : (
          <li className={styles.mi} key={label}>{label}</li>
        )
      )}
    </ul>
  );
}
