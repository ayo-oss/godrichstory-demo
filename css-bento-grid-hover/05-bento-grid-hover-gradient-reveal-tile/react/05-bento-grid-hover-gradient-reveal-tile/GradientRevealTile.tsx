import { CSSProperties } from "react";
import styles from "./GradientRevealTile.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface GradientRevealTileProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function GradientRevealTile({
  duration = "350ms",
  easing = "ease-out",
  color = "#2f6df6",
}: GradientRevealTileProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <span className={styles.scrim} />
        <span className={styles.label}>City lights</span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>Trending</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>New</span>
      </div>
    </div>
  );
}
