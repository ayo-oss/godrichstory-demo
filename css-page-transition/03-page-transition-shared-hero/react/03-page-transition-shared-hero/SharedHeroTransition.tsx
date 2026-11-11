import type { CSSProperties, ReactNode } from "react";
import styles from "./SharedHeroTransition.module.scss";

export type SharedHeroTransitionProps = {
  /** "list": 썸네일 격자, "hero": 확대된 상세 */
  active: "list" | "hero";
  caption: ReactNode;
  /** 확대가 끝나는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SharedHeroTransition({
  active,
  caption,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
  className = "",
}: SharedHeroTransitionProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.pages} ${className}`} style={vars} data-active={active}>
      <div className={styles.thumbRow}>
        <span className={styles.thumb} />
        <span className={styles.thumb} />
      </div>
      <div className={styles.hero} />
      <p className={styles.caption}>{caption}</p>
    </div>
  );
}
