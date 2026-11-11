import type { CSSProperties } from "react";
import styles from "./RainbowText.module.scss";

export type RainbowTextProps = {
  text: string;
  /** 색상환이 360도 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 그러데이션 시작 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function RainbowText({
  text,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: RainbowTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h1 className={styles.rainbow} style={vars}>{text}</h1>;
}
