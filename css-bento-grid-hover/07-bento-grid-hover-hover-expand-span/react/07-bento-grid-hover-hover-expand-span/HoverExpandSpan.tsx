import { CSSProperties } from "react";
import styles from "./HoverExpandSpan.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--scale"?: number;
};

export interface HoverExpandSpanProps {
  duration?: string;
  easing?: string;
  scale?: number;
}

// grid-column/row 의 span 값은 트랜지션이 걸리지 않아 transform: scale + z-index 로 확장을 흉내 낸다
export default function HoverExpandSpan({
  duration = "600ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  scale = 1.35,
}: HoverExpandSpanProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--scale": scale,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.focal}`}>
        <span className={styles.tag}>Live</span>
        <span className={styles.num}>128</span>
      </div>
      <div className={styles.tile}>
        <span className={styles.tag}>Users</span>
      </div>
      <div className={styles.tile}>
        <span className={styles.tag}>Sessions</span>
      </div>
      <div className={styles.tile}>
        <span className={styles.tag}>Errors</span>
      </div>
    </div>
  );
}
