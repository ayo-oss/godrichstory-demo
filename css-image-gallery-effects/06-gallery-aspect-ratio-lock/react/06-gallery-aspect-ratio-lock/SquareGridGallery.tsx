import type { CSSProperties } from "react";
import styles from "./SquareGridGallery.module.scss";

export type Photo = { src: string; alt?: string };

export type SquareGridGalleryProps = {
  photos?: Photo[];
  duration?: number;
  easing?: string;
  color?: string;
};

const swatch = (hex: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23${hex}'/%3E%3C/svg%3E`;

const DEFAULT_PHOTOS: Photo[] = ["17141a", "2f6df6", "17141a", "2f6df6", "17141a", "2f6df6"].map((h) => ({ src: swatch(h) }));

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** aspect-ratio: 1/1 + object-fit: cover 로 원본 비율과 상관없이 정사각형만 나열한다 (인스타그램 피드형) */
export default function SquareGridGallery({
  photos = DEFAULT_PHOTOS,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: SquareGridGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <ul className={styles.gallery} style={vars} aria-label="Photo gallery">
      {photos.map((p, i) => (
        <li key={i} className={styles.cell} tabIndex={0}>
          <img className={styles.photo} src={p.src} alt={p.alt ?? ""} />
        </li>
      ))}
    </ul>
  );
}
