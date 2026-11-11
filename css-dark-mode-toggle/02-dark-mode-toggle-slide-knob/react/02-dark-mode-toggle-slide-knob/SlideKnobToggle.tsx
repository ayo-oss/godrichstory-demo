import type { CSSProperties } from "react";
import styles from "./SlideKnobToggle.module.scss";

export type SlideKnobToggleProps = {
  dark: boolean;
  onToggle?: () => void;
  /** 노브가 미끄러지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SlideKnobToggle({
  dark,
  onToggle,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
  className = "",
}: SlideKnobToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <button
      type="button"
      className={`${styles.track} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={styles.knob} />
    </button>
  );
}
