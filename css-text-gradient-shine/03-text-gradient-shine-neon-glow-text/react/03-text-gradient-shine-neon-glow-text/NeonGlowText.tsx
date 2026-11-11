import type { CSSProperties } from "react";
import styles from "./NeonGlowText.module.scss";

export type NeonGlowTextProps = {
  text: string;
  /** 후광이 숨쉬는 한 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 후광 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function NeonGlowText({
  text,
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: NeonGlowTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <h1 className={styles.neon} style={vars} data-text={text}>
      {text}
    </h1>
  );
}
