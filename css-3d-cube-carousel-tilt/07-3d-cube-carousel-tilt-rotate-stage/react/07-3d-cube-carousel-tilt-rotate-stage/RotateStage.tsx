import type { CSSProperties } from "react";
import styles from "./RotateStage.module.scss";

export type RotateStageProps = {
  /** 한 바퀴 도는 시간 (기본 5000ms) — 느릴수록 고급스럽다 */
  duration?: number;
  easing?: string;
  /** 오브젝트 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RotateStage({
  duration = 5000,
  easing = "linear",
  color = "#0a4fe8",
  label = "신제품",
}: RotateStageProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.turntable}>
      <div className={styles.floor} />
      <div className={styles.object} style={vars}>
        <div className={`${styles.face} ${styles.front}`}>{label}</div>
        <div className={`${styles.face} ${styles.back}`} />
      </div>
    </div>
  );
}
