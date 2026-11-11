import { CSSProperties } from "react";
import styles from "./ScrollProgressLine.module.scss";

type Vars = CSSProperties & { "--color"?: string };

export interface ScrollProgressLineProps {
  color?: string;
  times?: string[];
}

// animation-timeline: scroll() 는 브라우저 지원이 갈린다 — Firefox·Safari 는 아직 없다.
// 지원 브라우저에서는 이 상자를 안에서 스크롤하면 JS 없이 옆 선이 진행률만큼 그려진다.
export default function ScrollProgressLine({
  color = "#17141a",
  times = ["09:00", "09:20", "10:00", "10:40", "11:10"],
}: ScrollProgressLineProps) {
  const style: Vars = { "--color": color };
  return (
    <div className={styles.box} style={style}>
      <span className={styles.rail} />
      <div className={styles.content}>
        {times.map((t) => (
          <div key={t} className={styles.item}>{t}</div>
        ))}
      </div>
    </div>
  );
}
