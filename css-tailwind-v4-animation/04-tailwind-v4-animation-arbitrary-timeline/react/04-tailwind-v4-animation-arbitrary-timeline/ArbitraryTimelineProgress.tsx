import type { CSSProperties } from "react";
import styles from "./ArbitraryTimelineProgress.module.scss";

export type ArbitraryTimelineProgressProps = {
  label?: string;
  /** 진행률이 다 차는 시간, ms — 실제 scroll-timeline 대신 안전한 루프로 재현 */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ArbitraryTimelineProgress({
  label = "A progress bar that fills as you read",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: ArbitraryTimelineProgressProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.page} style={vars}>
      <p className={styles.page__label}>{label}</p>
      <div className={styles.track}>
        <div className={styles.track__fill} />
      </div>
    </div>
  );
}
