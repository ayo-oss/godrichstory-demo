import type { CSSProperties } from "react";
import styles from "./ChromeMetalText.module.scss";

export type ChromeMetalTextProps = {
  text: string;
  /** 반사광이 표면을 한 번 훑는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 가장 어두운 밴드 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ChromeMetalText({
  text,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ChromeMetalTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h1 className={styles.chrome} style={vars}>{text}</h1>;
}
