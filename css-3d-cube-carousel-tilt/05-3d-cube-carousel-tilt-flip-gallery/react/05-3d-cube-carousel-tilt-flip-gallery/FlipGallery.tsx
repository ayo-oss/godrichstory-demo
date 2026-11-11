import type { CSSProperties } from "react";
import styles from "./FlipGallery.module.scss";

export type FlipGalleryProps = {
  duration?: number;
  easing?: string;
  /** 뒷면(카테고리) 배경 */
  color?: string;
  tiles?: string[];
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--delay"?: string };

export default function FlipGallery({
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
  tiles = ["사진", "동영상", "문서", "음악"],
}: FlipGalleryProps) {
  const base: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery}>
      {tiles.map((t, i) => (
        <li key={t} className={styles.tile}>
          <div className={styles.inner} style={{ ...base, "--delay": `${i * 0.15}s` } as Vars}>
            <div className={`${styles.face} ${styles.front}`} aria-hidden="true" />
            <div className={`${styles.face} ${styles.back}`}>{t}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
