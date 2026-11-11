import type { CSSProperties } from "react";
import styles from "./DotsScrollMarker.module.scss";

const SLIDES = ["여름 룩북", "위시리스트", "할인 특가"];

export type DotsScrollMarkerProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function DotsScrollMarker({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#ff4d1f" }: DotsScrollMarkerProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.dm} style={vars}>
      {/* 점(dot)은 브라우저가 ::scroll-marker 로 자동 생성한다 — React 상태 없이 CSS 만으로 */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {SLIDES.map((label, i) => (
            <div key={label} className={`${styles.slide} ${styles["slide" + (i + 1)]}`}>
              <span className={styles.cap}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
