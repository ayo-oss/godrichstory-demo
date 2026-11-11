import type { CSSProperties } from "react";
import styles from "./IndeterminateBar.module.scss";

export type IndeterminateBarProps = {
  /** 막대가 한 번 오가는 시간 (기본 1500ms) */
  duration?: number;
  /** 막대 색 */
  color?: string;
  /** 트랙 너비 */
  width?: number;
  label?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string; "--width"?: string };

export default function IndeterminateBar({
  duration = 1500,
  color = "#2f6df6",
  width = 220,
  label = "Processing",
}: IndeterminateBarProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--color": color,
    "--width": `${width}px`,
  };
  return (
    <div className={styles.bar} style={vars} role="progressbar" aria-label={label}>
      <span className={styles.fill} aria-hidden="true" />
    </div>
  );
}
