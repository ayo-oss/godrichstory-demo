import type { CSSProperties } from "react";
import styles from "./Fireflies.module.scss";

export type FirefliesProps = {
  /** 애니메이션 기준 시간(ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 피사체 색 */
  color?: string;
};

type Vars = CSSProperties & { "--i"?: number };

const COUNT = 16;

export default function Fireflies({
  duration = 3500,
  easing = "ease-in-out",
  color = "#fff7e6",
}: FirefliesProps) {
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
