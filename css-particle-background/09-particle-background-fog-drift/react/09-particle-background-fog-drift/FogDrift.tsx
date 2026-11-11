import type { CSSProperties } from "react";
import styles from "./FogDrift.module.scss";

export type FogDriftProps = {
  /** 애니메이션 기준 시간(ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 피사체 색 */
  color?: string;
};

type Vars = CSSProperties & { "--i"?: number };

const COUNT = 3;

export default function FogDrift({
  duration = 2000,
  easing = "linear",
  color = "#fff7e6",
}: FogDriftProps) {
  const vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.field} style={vars} aria-hidden="true">
      <span className={styles.p} />
      <span className={styles.p} />
      <span className={styles.p} />
    </div>
  );
}
