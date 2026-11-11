import type { CSSProperties } from "react";
import styles from "./HoverZoomProductGallery.module.scss";

export type HoverZoomProductGalleryProps = {
  duration?: number;
  easing?: string;
  /** 사진 그러데이션 포인트 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

const PRODUCTS = [
  { tone: "a", price: "$29" },
  { tone: "b", price: "$18" },
  { tone: "c", price: "$42" },
  { tone: "d", price: "$12" },
];

/** 커서를 올리면 액자는 그대로인 채 안쪽 사진만 확대되고, 아래에서 가격표가 슬라이드로 올라온다 */
export default function HoverZoomProductGallery({
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: HoverZoomProductGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Product gallery">
      {PRODUCTS.map((p, i) => (
        <li key={i} className={styles.card} tabIndex={0}>
          <span className={`${styles.img} ${styles["img-" + p.tone]}`} />
          <span className={styles.price}>{p.price}</span>
        </li>
      ))}
    </ul>
  );
}
