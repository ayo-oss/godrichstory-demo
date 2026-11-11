import type { CSSProperties } from "react";
import styles from "./PauseHoverMarquee.module.scss";

export type PauseHoverMarqueeProps = {
  text?: string;
  /** 한 바퀴가 도는 시간 (기본 10000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PauseHoverMarquee({
  text = "지금 가입하면 첫 달 무료",
  duration = 10000,
  easing = "linear",
  color = "#fff7e6",
}: PauseHoverMarqueeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.marquee} style={vars} tabIndex={0}>
      <div className={styles.track}>
        <span className={styles.chip}>{text}</span>
        <span className={styles.chip} aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
