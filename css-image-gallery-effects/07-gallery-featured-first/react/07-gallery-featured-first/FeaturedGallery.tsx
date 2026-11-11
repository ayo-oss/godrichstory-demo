import type { CSSProperties } from "react";
import styles from "./FeaturedGallery.module.scss";

export type FeaturedGalleryProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 첫 번째 사진에만 grid-column/grid-row span 2 를 줘서 네 배 크게 띄우는 잡지형 레이아웃 */
export default function FeaturedGallery({
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: FeaturedGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      <li className={styles.featured} tabIndex={0} />
      <li className={styles.small} tabIndex={0} />
      <li className={styles.small} tabIndex={0} />
    </ul>
  );
}
