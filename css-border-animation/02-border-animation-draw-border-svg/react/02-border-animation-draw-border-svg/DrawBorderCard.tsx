import type { CSSProperties } from "react";
import styles from "./DrawBorderCard.module.scss";

export type DrawBorderCardProps = {
  title: string;
  meta: string;
  /** 테두리가 다 그려지는 시간 (기본 2000ms, 루프용) */
  duration?: number;
  easing?: string;
  /** 선 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DrawBorderCard({
  title,
  meta,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: DrawBorderCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.card} style={vars}>
      <svg className={styles.svg} viewBox="0 0 220 130" preserveAspectRatio="none" aria-hidden="true">
        <rect className={styles.rect} x="2" y="2" width="216" height="126" rx="14" pathLength={100} />
      </svg>
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </div>
  );
}
