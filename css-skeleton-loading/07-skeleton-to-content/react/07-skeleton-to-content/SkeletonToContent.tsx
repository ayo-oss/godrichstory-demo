import type { CSSProperties, ReactNode } from "react";
import styles from "./SkeletonToContent.module.scss";

export type SkeletonToContentProps = {
  loading: boolean;
  children: ReactNode;
  /** 막대 ↔ 내용 전환 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

export default function SkeletonToContent({
  loading,
  children,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
  className = "",
}: SkeletonToContentProps) {
  const vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <div className={`${styles.card} ${className}`} style={vars} aria-busy={loading}>
      <div className={`${styles.skeleton} ${loading ? "" : styles.hide}`} aria-hidden={!loading}>
        <div className={styles.bar} style={{ width: "90%" } as CSSProperties} />
        <div className={styles.bar} style={{ width: "70%" } as CSSProperties} />
        <div className={styles.bar} style={{ width: "50%" } as CSSProperties} />
      </div>
      <div className={`${styles.content} ${loading ? styles.hide : ""}`}>{children}</div>
    </div>
  );
}
