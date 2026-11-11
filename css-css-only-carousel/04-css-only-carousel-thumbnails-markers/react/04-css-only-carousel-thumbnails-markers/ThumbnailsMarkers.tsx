import type { CSSProperties } from "react";
import styles from "./ThumbnailsMarkers.module.scss";

const SLIDES: { label: string; thumb: string }[] = [
  { label: "블루", thumb: "#2f6df6" },
  { label: "오렌지", thumb: "#ff4d1f" },
  { label: "블랙", thumb: "#17141a" },
];

export type ThumbnailsMarkersProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--thumb"?: string };

export default function ThumbnailsMarkers({ duration = 300, easing = "cubic-bezier(.2,.8,.2,1)", color = "#fff7e6" }: ThumbnailsMarkersProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.tm} style={vars}>
      {/* 썸네일도 ::scroll-marker 하나 — 색은 슬라이드의 --thumb 변수를 물려받는다 */}
      <div className={styles.viewport}>
        <div className={styles.track}>
          {SLIDES.map((s) => (
            <div key={s.label} className={styles.slide} style={{ "--thumb": s.thumb } as Vars}>
              <span className={styles.cap}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
