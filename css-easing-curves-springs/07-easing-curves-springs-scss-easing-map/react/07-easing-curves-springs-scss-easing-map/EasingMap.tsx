import type { CSSProperties } from "react";
import styles from "./EasingMap.module.scss";

// SCSS $easings 맵과 같은 값을 JS 객체로 옮겼다 — 이름으로 곡선을 찾는 패턴은 언어가 달라도 같다
const EASINGS = {
  "ease-out-quart": "cubic-bezier(.25, 1, .5, 1)",
  "ease-in-out-back": "cubic-bezier(.68, -.6, .32, 1.6)",
  "spring-gentle": "linear(0, .044, .153, .297, .452, .602, .736, .849, .937, 1.002, 1.045, 1.071, 1.082, 1.083, 1.077, 1.066, 1.053, 1.04, 1.028, 1.018, 1.009, 1.003, 1)",
  "spring-snappy": "linear(0, .055, .197, .394, .612, .824, 1.009, 1.153, 1.25, 1.3, 1.307, 1.281, 1.231, 1.167, 1.099, 1.035, .982, .942, .916, .905, .907, .917, .935, .955, .976, .995, 1)",
} as const;

export type EasingMapProps = {
  duration?: number;
  color?: string;
  /** 위 EASINGS 의 키. 기본은 SCSS 판과 같은 spring-snappy */
  easing?: keyof typeof EASINGS;
};

export default function EasingMap({ duration = 2000, color = "#fff7e6", easing = "spring-snappy" }: EasingMapProps) {
  const vars: CSSProperties = {
    "--duration": `${duration}ms`,
    "--color": color,
    "--ease": EASINGS[easing],
  } as CSSProperties;
  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.track}>
        <span className={`${styles.dot} ${styles.dotStart}`} />
        <span className={`${styles.dot} ${styles.dotEnd}`} />
        <div className={styles.puck}>S</div>
      </div>
    </div>
  );
}
