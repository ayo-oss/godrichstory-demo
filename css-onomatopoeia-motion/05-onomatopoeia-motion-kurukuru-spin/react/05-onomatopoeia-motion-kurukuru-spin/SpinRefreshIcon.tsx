import type { CSSProperties, MouseEvent } from "react";
import styles from "./SpinRefreshIcon.module.scss";

export type SpinRefreshIconProps = {
  label?: string;
  /** 한 바퀴 도는 데 걸리는 시간 (기본 1600ms) */
  duration?: number;
  easing?: string;
  color?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SpinRefreshIcon({
  label = "새로고침",
  duration = 1600,
  easing = "cubic-bezier(.65,0,.35,1)",
  color = "#fff7e6",
  onClick,
}: SpinRefreshIconProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <button type="button" className={styles.icon} style={vars} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
        <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
