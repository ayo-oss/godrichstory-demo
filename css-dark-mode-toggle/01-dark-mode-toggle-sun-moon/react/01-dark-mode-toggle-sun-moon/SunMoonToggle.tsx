import type { CSSProperties } from "react";
import styles from "./SunMoonToggle.module.scss";

export type SunMoonToggleProps = {
  /** 다크모드가 켜져 있는가 */
  dark: boolean;
  onToggle?: () => void;
  /** 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SunMoonToggle({
  dark,
  onToggle,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  className = "",
}: SunMoonToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={styles.sun} />
      <span className={styles.moon} />
    </button>
  );
}
