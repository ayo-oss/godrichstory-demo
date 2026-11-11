import { CSSProperties } from "react";
import styles from "./HoverCaptionGrid.module.scss";

export interface HoverCaptionGridProps {
  duration?: string;
  easing?: string;
  color?: string;
}

const TILES = [
  { id: "a", label: "Interior" },
  { id: "b", label: "Outdoor" },
  { id: "c", label: "Detail" },
] as const;

export default function HoverCaptionGrid({
  duration = "300ms",
  easing = "ease-out",
  color = "#17141a",
}: HoverCaptionGridProps) {
  const capStyle: CSSProperties = { transitionDuration: duration, transitionTimingFunction: easing, background: `rgba(23, 20, 26, .78)` };
  return (
    <div className={styles.grid}>
      {TILES.map((t) => (
        <div key={t.id} className={`${styles.tile} ${styles["tile" + t.id.toUpperCase()]}`}>
          <span className={styles.cap} style={capStyle}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
