import type { CSSProperties } from "react";
import styles from "./CubeRotate.module.scss";

export type CubeRotateProps = {
  /** 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  /** CSS easing (기본 linear — 등속이어야 멈칫거리지 않는다) */
  easing?: string;
  /** 큐브 면 색 */
  color?: string;
  /** 4면에 넣을 라벨 */
  faces?: [string, string, string, string];
  className?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function CubeRotate({
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
  faces = ["제품", "리뷰", "가격", "문의"],
  className = "",
}: CubeRotateProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={`${styles.scene} ${className}`} style={vars}>
      <div className={styles.cube}>
        <div className={`${styles.face} ${styles.front}`}>{faces[0]}</div>
        <div className={`${styles.face} ${styles.right}`}>{faces[1]}</div>
        <div className={`${styles.face} ${styles.back}`}>{faces[2]}</div>
        <div className={`${styles.face} ${styles.left}`}>{faces[3]}</div>
      </div>
    </div>
  );
}
