import type { CSSProperties } from "react";
import styles from "./BubblesRise.module.scss";

export type BubblesRiseProps = {
  /** 애니메이션 기준 시간(ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 피사체 색 */
  color?: string;
};

type Vars = CSSProperties & { "--i"?: number };

const COUNT = 20;

export default function BubblesRise({
  duration = 4000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: BubblesRiseProps) {
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
