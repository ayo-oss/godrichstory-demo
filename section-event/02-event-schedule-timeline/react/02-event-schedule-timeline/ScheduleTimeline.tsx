import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ScheduleTimeline.module.scss";

const STOPS = [
  { time: "09:00", label: "등록·웰컴 커피" },
  { time: "10:00", label: "기조연설" },
  { time: "13:00", label: "네트워킹 런치" },
  { time: "15:00", label: "패널 토론" },
];

export type ScheduleTimelineProps = { duration?: number; easing?: string; color?: string };
type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ScheduleTimeline({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#17141a" }: ScheduleTimelineProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.tl} style={vars}>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ transform: `scaleY(${(active + 1) / STOPS.length})` }} />
      </span>
      <ol className={styles.list}>
        {STOPS.map((s, i) => (
          <li key={s.time}>
            <button
              type="button"
              className={styles.stop}
              aria-current={i === active ? "step" : undefined}
              onClick={() => setActive(i)}
            >
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.time}>{s.time}</span>
              <span className={styles.label}>{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
