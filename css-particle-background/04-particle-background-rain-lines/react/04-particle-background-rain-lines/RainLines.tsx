import type { CSSProperties } from "react";
import styles from "./RainLines.module.scss";

export type RainLinesProps = {
  /** 애니메이션 기준 시간(ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 피사체 색 */
  color?: string;
};

type Vars = CSSProperties & { "--i"?: number };

const COUNT = 22;

export default function RainLines({
  duration = 600,
  easing = "linear",
  color = "#2f6df6",
}: RainLinesProps) {
  const vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.field} style={vars} aria-hidden="true">
      {Array.from({ length: COUNT }, (_, i) => (
        <span key={i} className={styles.p} style={{ "--i": i } as Vars} />
      ))}
    </div>
  );
}
