import type { CSSProperties } from "react";
import styles from "./SpinUtilRings.module.scss";

export type SpinUtilRingsProps = {
  /** 기본 animate-spin 속도, ms */
  duration?: number;
  /** --animate-spin-slow 속도, ms */
  slowDuration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--slow-duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function SpinUtilRings({
  duration = 1000,
  slowDuration = 3000,
  easing = "linear",
  color = "#2f6df6",
}: SpinUtilRingsProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--slow-duration": `${slowDuration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.row} style={vars}>
      <span className={styles.ring} aria-hidden="true" />
      <span className={`${styles.ring} ${styles["ring--slow"]}`} aria-hidden="true" />
    </div>
  );
}
