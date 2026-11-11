import type { CSSProperties } from "react";
import styles from "./FlipCardToggle.module.scss";

export type FlipCardToggleProps = {
  dark: boolean;
  onToggle?: () => void;
  /** 카드가 뒤집히는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function FlipCardToggle({
  dark,
  onToggle,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  className = "",
}: FlipCardToggleProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <button
      type="button"
      className={`${styles.card} ${className}`}
      style={vars}
      data-dark={dark}
      aria-label="다크모드 전환"
      onClick={onToggle}
    >
      <span className={styles.inner}>
        <span className={`${styles.face} ${styles.front}`}>라이트</span>
        <span className={`${styles.face} ${styles.back}`}>다크</span>
      </span>
    </button>
  );
}
