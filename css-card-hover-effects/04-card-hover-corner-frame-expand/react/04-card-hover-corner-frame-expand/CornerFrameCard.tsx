import type { CSSProperties } from "react";
import styles from "./CornerFrameCard.module.scss";

export type CornerFrameCardProps = {
  title: string;
  /** 브래킷이 자라는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 브래킷 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CornerFrameCard({
  title,
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: CornerFrameCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <span className={`${styles.corner} ${styles.tl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.tr}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.bl}`} aria-hidden="true" />
      <span className={`${styles.corner} ${styles.br}`} aria-hidden="true" />
      <span className={styles.media} aria-hidden="true" />
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
      </div>
    </article>
  );
}
