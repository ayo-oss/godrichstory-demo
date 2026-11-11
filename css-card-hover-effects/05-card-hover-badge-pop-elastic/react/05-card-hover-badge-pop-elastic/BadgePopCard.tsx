import type { CSSProperties } from "react";
import styles from "./BadgePopCard.module.scss";

export type BadgePopCardProps = {
  title: string;
  meta: string;
  badge: string;
  /** 뱃지가 튀는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 뱃지 배경 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BadgePopCard({
  title,
  meta,
  badge,
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: BadgePopCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <span className={styles.badge} aria-hidden="true">{badge}</span>
      <span className={styles.media} aria-hidden="true" />
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
