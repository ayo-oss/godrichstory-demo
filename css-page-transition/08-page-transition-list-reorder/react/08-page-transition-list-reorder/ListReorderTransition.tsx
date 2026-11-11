import type { CSSProperties, ReactNode } from "react";
import styles from "./ListReorderTransition.module.scss";

export type ListReorderTransitionProps = {
  /** "asc": 기본 순서, "swapped": 1·2위가 바뀐 순서 */
  active: "asc" | "swapped";
  row1: ReactNode;
  row2: ReactNode;
  row3: ReactNode;
  /** 이동이 끝나는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ListReorderTransition({
  active,
  row1,
  row2,
  row3,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#0a4fe8",
  className = "",
}: ListReorderTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <div className={styles.rows}>
        <div className={styles.row1}>{row1}</div>
        <div className={styles.row2}>{row2}</div>
        <div className={styles.row3}>{row3}</div>
      </div>
    </div>
  );
}
