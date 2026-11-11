import { useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ProgressMarker.module.scss";

const SLIDES = ["01 · 브랜드 소개", "02 · 이번 시즌 컬렉션", "03 · 매장 안내"];

export type ProgressMarkerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--i"?: number };

export default function ProgressMarker({ duration = 300, easing = "ease-out", color = "#2f6df6" }: ProgressMarkerProps) {
  const [active, setActive] = useState(0);
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--i": active };
  return (
    <div className={styles.pm} style={vars}>
      <div className={styles.bar}>
        <span className={styles.fill} style={{ width: `${((active + 1) / SLIDES.length) * 100}%` }} />
        {SLIDES.map((label, i) => (
          <button key={label} type="button" aria-label={`${i + 1}번으로 이동`} className={styles.seg} onClick={() => setActive(i)} />
        ))}
      </div>
      <div className={styles.viewport}>
        <div className={styles.track} style={{ transform: `translateX(calc(${-active * 100}% / ${SLIDES.length}))` }}>
          {SLIDES.map((label, i) => (
            <button key={label} type="button" className={styles.slide} onClick={() => setActive(i)}>
              <span className={styles.cap}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
