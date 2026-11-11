import type { CSSProperties } from "react";
import styles from "./LinearFillBar.module.scss";

export type LinearFillBarProps = {
  /** 0~100. 실제 진행률 숫자 그대로 넘긴다 (스크롤이 아니다) */
  percent: number;
  duration?: number;
  easing?: string;
  color?: string;
  label?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--percent"?: number;
};

export default function LinearFillBar({
  percent,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
  label,
}: LinearFillBarProps) {
  const p = Math.max(0, Math.min(100, percent));
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--percent": p };

  return (
    <div
      className={styles.track}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={p}
      aria-label={label}
    >
      <div className={styles.bar} />
    </div>
  );
}
