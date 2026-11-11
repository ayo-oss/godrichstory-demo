import type { CSSProperties, ReactNode } from "react";
import styles from "./HopHint.module.scss";

export type HopHintProps = {
  children: ReactNode;
  /** 한 번 뛰는 데 걸리는 시간 (기본 900ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function HopHint({
  children,
  duration = 900,
  easing = "ease-in-out",
  color = "#2f6df6",
}: HopHintProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.hint} style={vars}>
      <span className={styles.arrow} aria-hidden="true">
        ↓
      </span>
      {children}
    </div>
  );
}
