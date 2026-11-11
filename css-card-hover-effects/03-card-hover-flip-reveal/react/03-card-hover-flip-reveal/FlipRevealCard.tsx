import type { CSSProperties, ReactNode } from "react";
import styles from "./FlipRevealCard.module.scss";

export type FlipRevealCardProps = {
  title: string;
  meta: string;
  back: ReactNode;
  /** 뒤집히는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 뒷면 배경 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FlipRevealCard({
  title,
  meta,
  back,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: FlipRevealCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <div className={styles.flip}>
        <div className={`${styles.face} ${styles.faceFront}`}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>{meta}</p>
        </div>
        <div className={`${styles.face} ${styles.faceBack}`}>{back}</div>
      </div>
    </article>
  );
}
