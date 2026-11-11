import type { CSSProperties, ReactNode } from "react";
import styles from "./ZoomCardTransition.module.scss";

export type ZoomCardTransitionProps = {
  /** "grid": 카드 목록, "detail": 확대된 상세 */
  active: "grid" | "detail";
  detail: ReactNode;
  /** 확대가 끝나는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ZoomCardTransition({
  active,
  detail,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
  className = "",
}: ZoomCardTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <div className={styles.grid}>
        <span className={styles.cellFocus} />
        <span className={styles.cell} />
        <span className={styles.cell} />
        <span className={styles.cell} />
      </div>
      <div className={styles.detail}>{detail}</div>
    </div>
  );
}
