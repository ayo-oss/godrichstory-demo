import type { CSSProperties } from "react";
import styles from "./VariableSpeedMarquee.module.scss";

export type VariableSpeedMarqueeProps = {
  count?: number;
  duration?: number;
  /** 비선형 타이밍 함수 — 이음매 근처는 느리고 가운데는 빠르다 */
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VariableSpeedMarquee({
  count = 5,
  duration = 9000,
  easing = "cubic-bezier(.65,0,.35,1)",
  color = "#fff7e6",
}: VariableSpeedMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const dots = Array.from({ length: count * 2 });

  return (
    <div className={styles.marquee} style={vars}>
      <div className={styles.track}>
        {dots.map((_, i) => (
          <span key={i} className={styles.chip} aria-hidden={i >= count} />
        ))}
      </div>
    </div>
  );
}
