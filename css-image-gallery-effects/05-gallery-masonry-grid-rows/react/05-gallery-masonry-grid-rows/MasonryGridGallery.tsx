import type { CSSProperties } from "react";
import styles from "./MasonryGridGallery.module.scss";

export type MasonryGridGalleryProps = {
  /** 4px 행 단위로 각 사진이 차지할 span 수 — 자기 높이에 맞게 미리 계산한다 */
  spans?: number[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** grid-auto-rows 를 작은 단위로 쪼개고 grid-row-end: span N 을 주면, 컬럼 방식과 달리 읽는 순서(왼→오)가 유지된다 */
export default function MasonryGridGallery({
  spans = [10, 13, 9, 12, 10],
  duration = 220,
  easing = "ease-out",
  color = "#fff7e6",
}: MasonryGridGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {spans.map((s, i) => (
        <li key={i} className={styles.tile} style={{ gridRowEnd: `span ${s}` }} tabIndex={0} />
      ))}
    </ul>
  );
}
