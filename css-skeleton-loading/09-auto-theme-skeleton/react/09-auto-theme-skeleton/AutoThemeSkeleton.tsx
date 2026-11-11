import type { CSSProperties } from "react";
import styles from "./AutoThemeSkeleton.module.scss";

export type AutoThemeSkeletonProps = {
  className?: string;
};

// light-dark() 가 색을 정하므로 이 컴포넌트에는 상태·prop 이 필요 없다.
// 시스템(또는 :root 의 color-scheme)이 바뀌면 배경·막대 색이 스스로 바뀐다.
export default function AutoThemeSkeleton({ className = "" }: AutoThemeSkeletonProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.bar} style={{ width: "85%" } as CSSProperties} />
      <div className={styles.bar} style={{ width: "55%" } as CSSProperties} />
    </div>
  );
}
