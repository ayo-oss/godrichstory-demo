import type { CSSProperties } from "react";
import styles from "./GradientAngleMove.module.scss";

export type GradientAngleMoveProps = {
  text: string;
  /** 각도가 360deg 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 글자 기준 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GradientAngleMove({
  text,
  duration = 2000,
  easing = "linear",
  color = "#17141a",
}: GradientAngleMoveProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h1 className={styles.spin} style={vars}>{text}</h1>;
}
