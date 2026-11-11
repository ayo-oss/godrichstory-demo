import type { CSSProperties } from "react";
import styles from "./ShineSweepText.module.scss";

export type ShineSweepTextProps = {
  text: string;
  /** 빛 띠가 한 번 훑고 돌아오는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 바탕 글자 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShineSweepText({
  text,
  duration = 2000,
  easing = "ease-out",
  color = "#17141a",
}: ShineSweepTextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <h1 className={styles.sheen} style={vars}>
      <span className={styles.base}>{text}</span>
      <span className={styles.light} aria-hidden="true">{text}</span>
    </h1>
  );
}
