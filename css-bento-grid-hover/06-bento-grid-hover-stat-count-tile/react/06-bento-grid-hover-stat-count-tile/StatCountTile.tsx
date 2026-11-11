import { CSSProperties } from "react";
import styles from "./StatCountTile.module.scss";

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--target"?: number;
};

export interface StatCountTileProps {
  duration?: string;
  easing?: string;
  target?: number;
}

// 지원: Chromium·Safari 16.4+·Firefox 128+. 미지원 브라우저는 카운트업 없이 목표값이 바로 보인다
export default function StatCountTile({
  duration = "1.2s",
  easing = "ease-out",
  target = 87,
}: StatCountTileProps) {
  const style: Vars = {
    "--duration": duration,
    "--easing": easing,
    "--target": target,
  };
  return (
    <div className={styles.grid} style={style}>
      <div className={`${styles.tile} ${styles.tileA} ${styles.focal}`}>
        <span className={styles.tag}>Conversion</span>
        <span className={styles.stat}>
          <span className={styles.value} />
          <span className={styles.unit}>%</span>
        </span>
      </div>
      <div className={`${styles.tile} ${styles.tileB}`}>
        <span className={styles.tag}>Live</span>
      </div>
      <div className={`${styles.tile} ${styles.tileC}`}>
        <span className={styles.tag}>+9 today</span>
      </div>
    </div>
  );
}
