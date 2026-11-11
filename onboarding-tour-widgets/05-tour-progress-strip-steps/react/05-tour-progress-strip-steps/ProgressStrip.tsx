import type { CSSProperties } from "react";
import styles from "./ProgressStrip.module.scss";

export type ProgressStripProps = {
  duration?: number;
  easing?: string;
  color?: string;
  title?: string;
  caption?: string;
  steps?: number;
  /** 칸 사이 시차 (ms) */
  stagger?: number;
};

export default function ProgressStrip({
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
  title = "Account setup",
  caption = "Almost there",
  steps = 5,
  stagger = 200,
}: ProgressStripProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.wrap} style={vars}>
      <div className={styles.head}>
        <span className={styles.h}>{title}</span>
        <span className={styles.p}>{steps} steps</span>
      </div>
      <div className={styles.strip} aria-label={title}>
        {Array.from({ length: steps }, (_, i) => {
          // 시차는 인라인으로. scss 에서 animation 단축 속성을 쓰면 이 값이 리셋된다
          const delay = { animationDelay: `${stagger * i}ms` } as CSSProperties;
          return (
            <span className={styles.seg} key={i}>
              <i className={styles.fill} style={delay} />
              <i className={styles.flash} style={delay} />
            </span>
          );
        })}
      </div>
      <p className={styles.cap}>{caption}</p>
    </div>
  );
}
