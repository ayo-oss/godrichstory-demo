import type { CSSProperties, ReactNode } from "react";
import styles from "./TapScaleCard.module.scss";

export type TapScaleCardProps = {
  title: string;
  meta: string;
  duration?: number;
  easing?: string;
  media?: ReactNode;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function TapScaleCard({
  title,
  meta,
  duration = 220,
  easing = "ease-out",
  media,
}: TapScaleCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <span className={styles.media} aria-hidden="true">{media}</span>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
