import type { CSSProperties } from "react";
import styles from "./VerticalSnap.module.scss";

export type VerticalSnapProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function VerticalSnap({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff4d1f" }: VerticalSnapProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.vs} style={vars}>
      {/* 가로가 아니라 세로로 overflow-y:auto + scroll-snap-type: y 만으로 끝난다 — 0줄 JS */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[1, 2, 3].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
