import type { CSSProperties } from "react";
import styles from "./GlitchText.module.scss";

export type GlitchTextProps = {
  text: string;
  /** 스캔라인이 어긋났다 돌아오는 한 주기 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 어긋나는 레이어 한쪽 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GlitchText({
  text,
  duration = 2000,
  easing = "steps(2, jump-none)",
  color = "#c2361a",
}: GlitchTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <h1 className={styles.glitch} style={vars}>
      <span className={styles.base}>{text}</span>
      <span className={styles.r} aria-hidden="true">{text}</span>
      <span className={styles.b} aria-hidden="true">{text}</span>
    </h1>
  );
}
