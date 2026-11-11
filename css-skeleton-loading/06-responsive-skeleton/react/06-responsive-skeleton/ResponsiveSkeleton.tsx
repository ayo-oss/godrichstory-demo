import type { CSSProperties } from "react";
import styles from "./ResponsiveSkeleton.module.scss";

export type ResponsiveSkeletonProps = {
  /** 카드 색 */
  color?: string;
  /** 카드 수 (기본 3) */
  count?: number;
  className?: string;
};

// 이 컴포넌트는 뷰포트가 아니라 **자신을 담는 상자의 실제 폭**에 반응한다 (@container).
// 사이드바에 놓든 본문에 놓든 같은 파일이 알아서 열 수를 바꾼다.
export default function ResponsiveSkeleton({
  color = "#17141a",
  count = 3,
  className = "",
}: ResponsiveSkeletonProps) {
  const vars = { "--color": color } as CSSProperties;
  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.grid}>
        {Array.from({ length: count }).map((_, i) => <div key={i} className={styles.card} />)}
      </div>
    </div>
  );
}
