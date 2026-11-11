import type { CSSProperties } from "react";
import styles from "./PeekNext.module.scss";

export type PeekNextProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PeekNext({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#2f6df6" }: PeekNextProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.pn} style={vars}>
      {/* 실제 동작은 overflow-x:auto + scroll-snap-type + scroll-padding-left 만으로 끝난다 — 0줄 JS */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`${styles.slide} ${styles["slide" + n]}`}>
              <span className={styles.cap}>{String(n).padStart(2, "0")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
