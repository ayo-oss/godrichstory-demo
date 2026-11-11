import type { CSSProperties } from "react";
import styles from "./ProgressBar.module.scss";

export type ProgressBarProps = {
  /** 바 두께 (기본 3px) */
  thickness?: number;
  /** 바 색 (기본 노랑) */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--thickness"?: string; "--color"?: string };

export default function ProgressBar({
  thickness = 3,
  color = "#ffd23f",
  className = "",
}: ProgressBarProps) {
  const vars: Vars = { "--thickness": `${thickness}px`, "--color": color };
  return <div className={`${styles.bar} ${className}`} style={vars} aria-hidden="true" />;
}
