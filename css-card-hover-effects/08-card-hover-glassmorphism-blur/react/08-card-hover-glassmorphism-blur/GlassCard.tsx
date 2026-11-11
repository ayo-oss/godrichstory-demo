import type { CSSProperties } from "react";
import styles from "./GlassCard.module.scss";

export type GlassCardProps = {
  title: string;
  meta: string;
  /** 블러·채도가 짙어지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 배경 블롭 강조색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GlassCard({
  title,
  meta,
  duration = 300,
  easing = "ease-out",
  color = "#c2361a",
}: GlassCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.stage} style={vars}>
      <span className={styles.blob} aria-hidden="true" />
      <article className={styles.card} tabIndex={0}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </article>
    </div>
  );
}
