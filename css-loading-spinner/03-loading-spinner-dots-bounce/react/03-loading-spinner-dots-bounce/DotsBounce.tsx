import type { CSSProperties } from "react";
import styles from "./DotsBounce.module.scss";

export type DotsBounceProps = {
  /** 점 하나의 바운스 주기 (기본 900ms) */
  duration?: number;
  /** 점 사이 시차 (기본 160ms) */
  delay?: number;
  /** 점 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--delay"?: string; "--color"?: string };

export default function DotsBounce({
  duration = 900,
  delay = 160,
  color = "#fff7e6",
  label = "Typing",
}: DotsBounceProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--delay": `${delay}ms`,
    "--color": color,
  };
  return (
    <div className={styles.dots} style={vars} role="status" aria-label={label}>
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </div>
  );
}
