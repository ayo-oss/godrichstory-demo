import type { CSSProperties } from "react";
import styles from "./InfiniteScrollPhotoWall.module.scss";

export type InfiniteScrollPhotoWallProps = {
  /** 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 대표 타일 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const ORDER = ["a", "b", "c", "d", "e", "a", "b", "c", "d", "e"] as const;

/** 작은 사진들이 가로로 끝없이 흐르고, 트랙을 통째로 복제해 이어붙인 자리가 안 보인다 */
export default function InfiniteScrollPhotoWall({
  duration = 2000,
  easing = "linear",
  color = "#ff9ebb",
}: InfiniteScrollPhotoWallProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.viewport} style={vars} aria-label="A gallery of photos scrolling endlessly">
      <ul className={styles.track}>
        {ORDER.map((tone, i) => (
          <li key={i} className={`${styles.tile} ${styles["tile-" + tone]}`} aria-hidden={i >= 5} />
        ))}
      </ul>
    </div>
  );
}
