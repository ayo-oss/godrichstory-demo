import { CSSProperties } from "react";
import styles from "./ReducedMotionFlip.module.scss";

export interface ReducedMotionFlipProps {
  duration?: string;
  easing?: string;
  front?: string;
  back?: string;
}

// prefers-reduced-motion 이 켜진 사용자는 3D 회전 대신 opacity 교차 페이드만 받는다 (CSS @media 블록, JS 분기 없음)
export default function ReducedMotionFlip({
  duration = "600ms",
  easing = "ease-out",
  front = "FRONT",
  back = "BACK",
}: ReducedMotionFlipProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.card} style={style}>
      <div className={styles.inner}>
        <div className={`${styles.face} ${styles.front}`}>{front}</div>
        <div className={`${styles.face} ${styles.back}`}>{back}</div>
      </div>
      <span className={styles.tag}>reduced-motion</span>
    </div>
  );
}
