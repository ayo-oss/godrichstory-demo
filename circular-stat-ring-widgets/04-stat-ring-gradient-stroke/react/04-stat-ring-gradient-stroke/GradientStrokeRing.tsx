import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./GradientStrokeRing.module.scss";

let gradSeq = 0;

export type GradientStrokeRingProps = {
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

export default function GradientStrokeRing({
  duration = 220,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#6ec8ff",
}: GradientStrokeRingProps) {
  const [num, setNum] = useState(74);
  // 한 페이지에 여러 개를 놔도 gradient id 가 부딪히지 않게 한다 (콜론은 url() 에서 못 쓴다)
  // 한 페이지에 여러 개를 놔도 그라디언트 id 가 안 부딪히게 인스턴스마다 새 번호를 받는다
  const [gradientId] = useState(() => `gdStroke-${++gradSeq}`);
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
    "--num": String(num),
  };

  return (
    <div className={styles.gd} style={vars}>
      <div className={styles.dial}>
        <svg className={styles.svg} viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="12" y1="12" x2="116" y2="116">
              <stop className={styles.stopA} offset="0" />
              <stop className={styles.stopB} offset="1" />
            </linearGradient>
          </defs>
          <circle className={styles.track} cx="64" cy="64" r="52" />
          <circle className={styles.ring} cx="64" cy="64" r="52" style={{ stroke: `url(#${gradientId})` }} />
        </svg>
        <div className={styles.center}>
          <span className={styles.num} role="status" aria-label="Current value" />
          <span className={styles.cap}>Conversion</span>
        </div>
      </div>
      <label className={styles.slider}>
        <span className={styles.sliderLabel}>Adjust value</span>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={100}
          value={num}
          onChange={(e: any) => setNum(Number(e.currentTarget.value))}
        />
      </label>
    </div>
  );
}
