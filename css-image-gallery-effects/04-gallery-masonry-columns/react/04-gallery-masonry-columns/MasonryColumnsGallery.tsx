import type { CSSProperties } from "react";
import styles from "./MasonryColumnsGallery.module.scss";

export type MasonryColumnsGalleryProps = {
  /** 타일 높이(px) 배열 — 사진마다 다른 높이 */
  heights?: number[];
  /** 타일이 나타나는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** columns: 2 만으로 자바스크립트 없이 워터폴을 만든다. break-inside: avoid 로 사진이 반으로 잘리지 않는다 */
export default function MasonryColumnsGallery({
  heights = [40, 52, 34, 46, 38],
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: MasonryColumnsGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {heights.map((h, i) => (
        <li key={i} className={styles.tile} style={{ height: h }} tabIndex={0} />
      ))}
    </ul>
  );
}
