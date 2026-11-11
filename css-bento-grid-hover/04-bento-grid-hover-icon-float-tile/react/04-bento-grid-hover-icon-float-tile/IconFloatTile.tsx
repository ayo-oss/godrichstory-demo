import { CSSProperties } from "react";
import styles from "./IconFloatTile.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export interface IconFloatTileProps {
  duration?: string;
  easing?: string;
  color?: string;
}

export default function IconFloatTile({
  duration = "1.4s",
  easing = "ease-out",
  color = "#2f6df6",
}: IconFloatTileProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--color": color,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <span className={styles.icon} />
        <span className={styles.label}>Fast</span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>Beta</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>v2</span>
      </div>
    </div>
  );
}
