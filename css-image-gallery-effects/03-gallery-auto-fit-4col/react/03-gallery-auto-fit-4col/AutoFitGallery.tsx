import type { CSSProperties } from "react";
import styles from "./AutoFitGallery.module.scss";

export type AutoFitGalleryProps = {
  /** 타일 개수 (기본 6) */
  count?: number;
  /** 타일이 자리를 잡는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 타일 그러데이션 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** grid-template-columns: repeat(auto-fit, minmax()) 한 줄로 미디어쿼리 없이 칸 수가 스스로 바뀐다 */
export default function AutoFitGallery({
  count = 6,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: AutoFitGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={`${styles.tile} ${i % 2 ? styles.even : styles.odd}`} tabIndex={0} />
      ))}
    </ul>
  );
}
