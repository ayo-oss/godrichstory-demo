import type { CSSProperties } from "react";
import styles from "./GradientTextFlow.module.scss";

export type GradientTextFlowProps = {
  text: string;
  /** 흐름 한 바퀴가 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 그러데이션 기준 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GradientTextFlow({
  text,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: GradientTextFlowProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h1 className={styles.flow} style={vars}>{text}</h1>;
}
