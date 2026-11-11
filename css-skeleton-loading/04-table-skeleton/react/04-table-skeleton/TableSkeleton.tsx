import type { CSSProperties } from "react";
import styles from "./TableSkeleton.module.scss";

export type TableSkeletonProps = {
  /** 빛이 표 몸통을 훑는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 ease-out) */
  easing?: string;
  /** 셀 색 */
  color?: string;
  /** 머리글 (열 폭은 이 배열 길이로 정해진다) */
  columns?: string[];
  /** 몸통 행 수 (기본 6) */
  rows?: number;
  className?: string;
};

export default function TableSkeleton({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
  columns = ["이름", "상태", "값", "날짜"],
  rows = 6,
  className = "",
}: TableSkeletonProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  const template = { gridTemplateColumns: `2fr repeat(${columns.length - 1}, 1fr)` } as CSSProperties;
  return (
    <div className={`${styles.table} ${className}`} style={vars}>
      <div className={`${styles.row} ${styles.head}`} style={template}>
        {columns.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div className={styles.body}>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={styles.row} style={template}>
            {columns.map((_, c) => <span key={c} className={styles.cell} />)}
          </div>
        ))}
        <span className={styles.sheen} aria-hidden="true" />
      </div>
    </div>
  );
}
