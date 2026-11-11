import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ReducedMotionMarquee.module.scss";

export type ReducedMotionMarqueeProps = {
  items?: string[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ReducedMotionMarquee({
  items = ["공지", "업데이트", "이벤트"],
  duration = 12000,
  easing = "linear",
  color = "#2f6df6",
}: ReducedMotionMarqueeProps) {
  const [reduced, setReduced] = useState(false);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    animationPlayState: reduced ? "paused" : "running",
  } as Vars;

  return (
    <div className={styles.panel}>
      <div className={styles.marquee}>
        <div className={styles.track} style={vars}>
          {items.map((it) => (
            <span key={it} className={styles.chip}>{it}</span>
          ))}
          {items.map((it) => (
            <span key={"dup-" + it} className={styles.chip} aria-hidden="true">{it}</span>
          ))}
        </div>
      </div>
      <span className={styles.state}>{reduced ? "정지됨" : "재생 중"}</span>
      <button type="button" className={styles.toggle} aria-pressed={reduced} onClick={() => setReduced((v) => !v)}>
        <span className={styles.switchTrack} data-on={reduced}><span className={styles.knob} /></span>
        동작 줄이기
      </button>
    </div>
  );
}
