import type { CSSProperties } from "react";
import styles from "./VerifiedBadgeRing.module.scss";

export type VerifiedBadgeRingProps = {
  label: string;
  /** 링이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 체크 아이콘 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VerifiedBadgeRing({
  label,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: VerifiedBadgeRingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.badge} style={vars}>
      <span className={styles.ring} aria-hidden="true" />
      <span className={styles.inner}>
        <span className={styles.check} aria-hidden="true">✓</span>
        <span className={styles.label}>{label}</span>
      </span>
    </div>
  );
}
