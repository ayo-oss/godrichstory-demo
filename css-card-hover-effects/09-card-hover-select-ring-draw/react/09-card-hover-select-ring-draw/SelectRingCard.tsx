import type { CSSProperties } from "react";
import styles from "./SelectRingCard.module.scss";

export type SelectRingCardProps = {
  title: string;
  meta: string;
  /** 링이 그려지는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 링 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SelectRingCard({
  title,
  meta,
  duration = 220,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: SelectRingCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <svg className={styles.ring} viewBox="0 0 160 100" aria-hidden="true">
        <rect className={styles.ringRect} x={2} y={2} width={156} height={96} rx={14} ry={14} />
      </svg>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
