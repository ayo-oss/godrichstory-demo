import { CSSProperties } from "react";
import styles from "./ViewRevealEvents.module.scss";

type Vars = CSSProperties & { "--color"?: string };

export interface ViewRevealEventsProps {
  color?: string;
  times?: string[];
}

// animation-timeline: view() 도 scroll() 과 같은 지원 범위다 — IntersectionObserver 없이
// 카드마다 자기가 뷰포트에 들어오는 구간에서 opacity·translateY 가 자동으로 움직인다.
export default function ViewRevealEvents({
  color = "#0a4fe8",
  times = ["09:00", "09:20", "10:00", "10:40"],
}: ViewRevealEventsProps) {
  const style: Vars = { "--color": color };
  return (
    <div className={styles.box} style={style}>
      {times.map((t) => (
        <div key={t} className={styles.card}>{t}</div>
      ))}
    </div>
  );
}
