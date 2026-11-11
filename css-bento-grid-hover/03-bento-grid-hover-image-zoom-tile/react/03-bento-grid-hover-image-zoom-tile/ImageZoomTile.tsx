import { CSSProperties } from "react";
import styles from "./ImageZoomTile.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface ImageZoomTileProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function ImageZoomTile({
  duration = "400ms",
  easing = "ease-out",
  color = "#2f6df6",
}: ImageZoomTileProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <div className={styles.media} />
        <span className={styles.label}>View</span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>Gallery</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>24 photos</span>
      </div>
    </div>
  );
}
