import type { CSSProperties } from "react";
import styles from "./OutlineGlowText.module.scss";

export type OutlineGlowTextProps = {
  text: string;
  /** 빛이 커졌다 작아지는 숨쉬기 한 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 윤곽선·빛 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function OutlineGlowText({
  text,
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: OutlineGlowTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return <h1 className={styles.outline} style={vars}>{text}</h1>;
}
