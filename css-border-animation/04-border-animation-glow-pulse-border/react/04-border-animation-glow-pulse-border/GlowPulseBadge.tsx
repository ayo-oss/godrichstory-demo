import type { CSSProperties } from "react";
import styles from "./GlowPulseBadge.module.scss";

export type GlowPulseBadgeProps = {
  label: string;
  /** 번졌다 가라앉는 한 번의 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 번짐 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GlowPulseBadge({
  label,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: GlowPulseBadgeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return <span className={styles.badge} style={vars}>{label}</span>;
}
