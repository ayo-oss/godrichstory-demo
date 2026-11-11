import type { CSSProperties } from "react";
import styles from "./TwoColGallery.module.scss";

export type TwoColGalleryProps = {
  /** 타일이 뜨는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 타일 그러데이션 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 사진 4장을 2×2 칸에 나누고, 커서가 올라간 칸만 떠오르며 그림자가 짙어진다 */
export default function TwoColGallery({
  duration = 220,
  easing = "ease-out",
  color = "#2f6df6",
}: TwoColGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className={`${styles.tile} ${styles["tile" + i]}`} tabIndex={0} />
      ))}
    </ul>
  );
}
