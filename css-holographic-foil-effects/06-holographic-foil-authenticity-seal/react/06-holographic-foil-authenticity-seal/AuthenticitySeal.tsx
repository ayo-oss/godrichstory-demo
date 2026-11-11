import type { CSSProperties } from "react";
import styles from "./AuthenticitySeal.module.scss";

export type AuthenticitySealProps = {
  text: string;
  /** 호버 시 회전이 빨라지는 애니메이션 길이 (기본 700ms) */
  duration?: number;
  easing?: string;
  /** 사용 안 함(참고용) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuthenticitySeal({
  text,
  duration = 700,
  easing = "linear",
  color = "#2f6df6",
}: AuthenticitySealProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.seal} style={vars} tabIndex={0}>
      <span className={styles.shape} aria-hidden="true" />
      <span className={styles.text}>{text}</span>
    </div>
  );
}
