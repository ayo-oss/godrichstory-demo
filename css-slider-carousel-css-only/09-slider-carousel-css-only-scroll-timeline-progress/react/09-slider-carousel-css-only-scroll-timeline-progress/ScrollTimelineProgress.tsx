import type { CSSProperties } from "react";
import styles from "./ScrollTimelineProgress.module.scss";

export type ScrollTimelineProgressProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ScrollTimelineProgress({ duration = 300, easing = "linear", color = "#2f6df6" }: ScrollTimelineProgressProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.sp} style={vars}>
      {/* 진행 바는 라디오도 JS 도 없이 animation-timeline 으로 실제 스크롤 위치를 그대로 읽는다 — 0줄 JS */}
      <div className={styles.bar}><div className={styles.fill} /></div>
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
