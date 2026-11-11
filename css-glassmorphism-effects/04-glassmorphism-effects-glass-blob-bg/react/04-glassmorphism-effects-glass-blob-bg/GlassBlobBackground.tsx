import { CSSProperties } from "react";
import styles from "./GlassBlobBackground.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--color"?: string;
};

export interface GlassBlobBackgroundProps {
  duration?: string;
  color?: string;
}

export default function GlassBlobBackground({
  duration = "2000ms",
  color = "#2f6df6",
}: GlassBlobBackgroundProps) {
  const style: Vars = { "--duration": duration, "--color": color };
  return (
    <div className={styles.scene} style={style}>
      <span className={`${styles.blob} ${styles.blobA}`} />
      <span className={`${styles.blob} ${styles.blobB}`} />
      <div className={styles.panel}>
        <span className={styles.panelTitle}>Live</span>
        <span className={styles.panelDesc}>Motion blurs through glass</span>
      </div>
    </div>
  );
}
