import type { CSSProperties } from "react";
import styles from "./HoloTextIridescent.module.scss";

export type HoloTextIridescentProps = {
  text: string;
  /** 색이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 사용 안 함 — 그라디언트가 색을 대신한다 (참고용) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HoloTextIridescent({
  text,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: HoloTextIridescentProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h2 className={styles.text} style={vars}>{text}</h2>;
}
