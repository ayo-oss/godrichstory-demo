import type { CSSProperties } from "react";
import styles from "./AvatarListSkeleton.module.scss";

export type AvatarListSkeletonProps = {
  /** 빛이 목록 전체를 훑는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 ease-out) */
  easing?: string;
  /** 아바타·막대 색 */
  color?: string;
  /** 줄 수 (기본 5) */
  rows?: number;
  className?: string;
};

const L1_WIDTHS = ["78%", "55%", "90%", "62%", "82%"];

export default function AvatarListSkeleton({
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
  rows = 5,
  className = "",
}: AvatarListSkeletonProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={`${styles.list} ${className}`} style={vars}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.row}>
          <span className={styles.avatar} />
          <span className={styles.meta}>
            <span className={styles.l1} style={{ width: L1_WIDTHS[i % L1_WIDTHS.length] } as CSSProperties} />
            <span className={styles.l2} />
          </span>
        </div>
      ))}
      <span className={styles.sheen} aria-hidden="true" />
    </div>
  );
}
