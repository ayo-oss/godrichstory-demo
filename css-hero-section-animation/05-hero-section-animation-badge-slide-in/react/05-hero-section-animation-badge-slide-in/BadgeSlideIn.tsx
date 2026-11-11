import type { CSSProperties } from "react";
import styles from "./BadgeSlideIn.module.scss";

export type BadgeSlideInProps = {
  label?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BadgeSlideIn({
  label = "NEW",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#06d6a0",
}: BadgeSlideInProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.panel} style={vars}>
      <span className={`${styles.bar} ${styles.barLg}`} aria-hidden="true" />
      <span className={`${styles.bar} ${styles.barSm}`} aria-hidden="true" />
      <span className={styles.badge}>{label}</span>
    </div>
  );
}
