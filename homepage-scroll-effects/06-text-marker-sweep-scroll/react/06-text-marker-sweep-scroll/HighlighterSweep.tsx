import type { CSSProperties } from "react";
import styles from "./HighlighterSweep.module.scss";

export type HighlighterSweepProps = {
  duration?: number;
  easing?: string;
  color?: string;
  before?: string;
  highlight?: string;
  after?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HighlighterSweep({
  duration = 300,
  easing = "linear",
  color = "#2f6df6",
  before = "이번 시즌",
  highlight = "단 하나의 세일",
  after,
}: HighlighterSweepProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.mk} style={vars}>
      {/* 형광펜 = 배경 그라디언트의 폭(view() 타임라인). 글자는 그대로 두고 배경만 자란다 */}
      <div className={styles.scroll}>
        <div className={styles.spacer} />
        <h2 className={styles.title}>
          {before} <span className={styles.hl}>{highlight}</span> {after}
        </h2>
        <div className={styles.spacer} />
      </div>
    </div>
  );
}
