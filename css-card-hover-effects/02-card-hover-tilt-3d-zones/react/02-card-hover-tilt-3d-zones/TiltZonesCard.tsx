import type { CSSProperties } from "react";
import styles from "./TiltZonesCard.module.scss";

export type TiltZonesCardProps = {
  title: string;
  meta: string;
  /** 기울어지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 안쪽 패널 배경 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 구역 4개 중 마우스가 올라간 구역에 따라 :has() 가 기울기를 고른다 — JS 좌표 추적이 없다 */
export default function TiltZonesCard({
  title,
  meta,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: TiltZonesCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <article className={styles.card} style={vars} tabIndex={0}>
      <div className={styles.zones} aria-hidden="true">
        <span className={`${styles.zone} ${styles.zoneTl}`} />
        <span className={`${styles.zone} ${styles.zoneTr}`} />
        <span className={`${styles.zone} ${styles.zoneBl}`} />
        <span className={`${styles.zone} ${styles.zoneBr}`} />
      </div>
      <div className={styles.inner}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.meta}>{meta}</p>
      </div>
    </article>
  );
}
