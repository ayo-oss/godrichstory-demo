import type { CSSProperties } from "react";
import styles from "./EclipseMaskToggle.module.scss";

export type EclipseMaskToggleProps = {
  dark: boolean;
  onToggle?: () => void;
  /** 마스크가 밀려오는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 마스크(다크) 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function EclipseMaskToggle({
  dark,
  onToggle,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  className = "",
}: EclipseMaskToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={`${styles.wrap} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={styles.sun} />
      <span className={styles.mask} />
    </button>
  );
}
