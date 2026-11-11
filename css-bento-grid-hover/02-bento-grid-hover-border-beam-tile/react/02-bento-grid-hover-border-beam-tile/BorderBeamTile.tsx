import { CSSProperties } from "react";
import styles from "./BorderBeamTile.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface BorderBeamTileProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function BorderBeamTile({
  duration = "1.6s",
  easing = "linear",
  color = "#2f6df6",
}: BorderBeamTileProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <span className={styles.tag}>Featured</span>
        <span className={styles.sub}>Pro plan</span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>+12</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>Live</span>
      </div>
    </div>
  );
}
