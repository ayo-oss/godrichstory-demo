import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RingCheckBadge.module.scss";

export type RingCheckBadgeProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
  "--num"?: string;
};

export default function RingCheckBadge({
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: RingCheckBadgeProps) {
  const [done, setDone] = useState(false);

  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num": done ? "100" : "64",
  };

  return (
    <div className={`${styles.bg} ${done ? styles.isDone : ""}`} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 104 104" width="104" height="104" aria-hidden="true">
          <g className={styles.rings}>
            <circle className={styles.track} cx="52" cy="52" r="44" />
            <circle className={styles.ring} cx="52" cy="52" r="44" />
          </g>
          {/* the check is one polyline, not an icon font — that is what lets dashoffset draw it */}
          <polyline className={styles.check} pathLength="100" points="36,53 47,64 69,40" />
        </svg>
        <span className={styles.num} role="status" aria-label="Progress" />
      </div>
      <button className={styles.btn} type="button" onClick={() => setDone((d) => !d)}>
        Mark done
      </button>
    </div>
  );
}
