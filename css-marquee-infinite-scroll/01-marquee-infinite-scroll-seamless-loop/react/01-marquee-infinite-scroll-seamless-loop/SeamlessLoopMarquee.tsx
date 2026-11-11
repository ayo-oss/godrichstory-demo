import type { CSSProperties } from "react";
import styles from "./SeamlessLoopMarquee.module.scss";

export type SeamlessLoopMarqueeProps = {
  items?: string[];
  /** 한 바퀴가 도는 시간 (기본 12000ms — 데모 gif 는 2000ms 로 배속) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function SeamlessLoopMarquee({
  items = ["A", "B", "C", "D", "E", "F"],
  duration = 12000,
  easing = "linear",
  color = "#fff7e6",
}: SeamlessLoopMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars}>
      <div className={styles.track}>
        {items.map((it) => (
          <span key={it} className={styles.chip}>{it}</span>
        ))}
        {items.map((it) => (
          <span key={"dup-" + it} className={styles.chip} aria-hidden="true">{it}</span>
        ))}
      </div>
    </div>
  );
}
