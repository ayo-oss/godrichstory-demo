import type { CSSProperties } from "react";
import styles from "./HapticLikeButton.module.scss";

export type HapticLikeButtonProps = {
  /** 지터가 끝나는 시간 — 아주 짧게 (기본 140ms) */
  duration?: number;
  easing?: string;
  ariaLabel?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function HapticLikeButton({
  duration = 140,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  ariaLabel = "좋아요",
}: HapticLikeButtonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <button type="button" className={styles.btn} style={vars} aria-label={ariaLabel}>
      <span className={styles.icon} aria-hidden="true">&#9829;</span>
    </button>
  );
}
