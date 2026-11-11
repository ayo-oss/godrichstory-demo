import type { CSSProperties } from "react";
import styles from "./ZoomCaptionCard.module.scss";

export type ZoomCaptionCardProps = {
  title: string;
  desc: string;
  /** 확대·캡션이 움직이는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 미디어 그라디언트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ZoomCaptionCard({
  title,
  desc,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: ZoomCaptionCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <div className={styles.frame}>
        <span className={styles.media} aria-hidden="true" />
        <div className={styles.caption}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.desc}>{desc}</p>
        </div>
      </div>
    </article>
  );
}
