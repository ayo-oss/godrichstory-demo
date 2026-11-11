import type { CSSProperties } from "react";
import styles from "./CtaBandLinear.module.scss";

export type CtaBandLinearProps = {
  title?: string;
  cta?: string;
  /** 테두리 그라디언트가 한 바퀴 도는 시간(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandLinear({
  title = "Move your team over today",
  cta = "Start for free",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: CtaBandLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.band} style={vars}>
      <div className={styles.inner}>
        <h3 className={styles.title}>{title}</h3>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
