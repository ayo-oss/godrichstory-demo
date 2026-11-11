import type { CSSProperties } from "react";
import styles from "./SkeletonToContentCard.module.scss";

export type SkeletonToContentCardProps = {
  loading: boolean;
  title: string;
  body: string;
  /** 전환 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SkeletonToContentCard({
  loading,
  title,
  body,
  duration = 600,
  easing = "ease-out",
  color = "#2f6df6",
}: SkeletonToContentCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.card} style={vars}>
      <div className={styles.layer} style={{ opacity: loading ? 1 : 0 }} aria-hidden="true">
        <span className={`${styles.sk} ${styles.avatar}`} />
        <div>
          <span className={`${styles.sk} ${styles.title}`} />
          <span className={`${styles.sk} ${styles.line}`} />
          <span className={`${styles.sk} ${styles.lineShort}`} />
        </div>
      </div>
      <div className={styles.layer} style={{ opacity: loading ? 0 : 1, transform: loading ? "scale(.98)" : "scale(1)" }}>
        <span className={styles.realAvatar} />
        <div>
          <p className={styles.realTitle}>{title}</p>
          <p className={styles.realBody}>{body}</p>
        </div>
      </div>
    </div>
  );
}
