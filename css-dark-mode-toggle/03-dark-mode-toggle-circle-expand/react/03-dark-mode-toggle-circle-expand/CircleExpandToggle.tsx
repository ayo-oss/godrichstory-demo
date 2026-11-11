import type { CSSProperties, ReactNode } from "react";
import styles from "./CircleExpandToggle.module.scss";

export type CircleExpandToggleProps = {
  dark: boolean;
  onToggle?: () => void;
  /** 원이 다 퍼지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 다크모드로 덮는 원의 색 */
  color?: string;
  children?: ReactNode;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CircleExpandToggle({
  dark,
  onToggle,
  duration = 600,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#17141a",
  children,
  className = "",
}: CircleExpandToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.panel} ${className}`} style={vars} data-dark={dark}>
      <div className={styles.content}>{children}</div>
      <span className={styles.wipe} />
      <button type="button" className={styles.origin} aria-label="다크모드 전환" onClick={onToggle} />
    </div>
  );
}
