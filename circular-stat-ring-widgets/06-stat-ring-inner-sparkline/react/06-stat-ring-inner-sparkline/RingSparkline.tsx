import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./RingSparkline.module.scss";

export type RingSparklineProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

const INITIAL_POINTS = "28,76 40,66 52,80 64,58 76,68 88,50 100,60";

// 7일치 y 값을 새로 뽑아 polyline 의 points 를 다시 쓴다. 선이 실제로 다른 모양이 된다
function nextPoints(): string {
  const pts: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    pts.push(`${(28 + i * 12).toFixed(1)},${(50 + Math.random() * 30).toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function RingSparkline({
  duration = 220,
  easing = "cubic-bezier(.2, 1.4, .4, 1)",
  color = "#2f6df6",
}: RingSparklineProps) {
  const [points, setPoints] = useState<string>(INITIAL_POINTS);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.sp} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="This month's progress ring with a 7-day line">
          <g className={styles.rings}>
            <circle className={styles.track} cx="64" cy="64" r="52" />
            <circle className={styles.ring} cx="64" cy="64" r="52" />
          </g>
          {/* pathLength="100" 을 주면 실제 좌표가 어떻든 길이를 100 으로 셀 수 있다 */}
          <polyline className={styles.line} pathLength="100" points={points} />
        </svg>
        <span className={styles.badge} aria-hidden="true">
          <svg viewBox="0 0 256 256" width="13" height="13">
            <g fill="currentColor">
              <path d="M232 56v64l-64-64Z" opacity=".2" />
              <path d="M232 48h-64a8 8 0 0 0-5.66 13.66L188.69 88L136 140.69l-34.34-34.35a8 8 0 0 0-11.32 0l-72 72a8 8 0 0 0 11.32 11.32L96 123.31l34.34 34.35a8 8 0 0 0 11.32 0L200 99.31l26.34 26.35A8 8 0 0 0 240 120V56a8 8 0 0 0-8-8m-8 52.69L187.31 64H224Z" />
            </g>
          </svg>
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.cap}>68% this month · last 7 days</span>
        <button className={styles.btn} type="button" onClick={() => setPoints(nextPoints())}>
          New data
        </button>
      </div>
    </div>
  );
}
