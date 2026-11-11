import type { CSSProperties } from "react";
import styles from "./LightboxGallery.module.scss";

export type Photo = { id: string; src: string; full: string };

export type LightboxGalleryProps = {
  photos?: Photo[];
  duration?: number;
  easing?: string;
};

const swatch = (hex: string, size = 200) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect width='${size}' height='${size}' fill='%23${hex}'/%3E%3C/svg%3E`;

const DEFAULT_PHOTOS: Photo[] = ["2f6df6", "17141a", "fff7e6", "2f6df6"].map((hex, i) => ({
  id: `lb-${i + 1}`,
  src: swatch(hex, 200),
  full: swatch(hex, 600),
}));

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

/**
 * popovertarget 하나로 여는 라이트박스 — 자바스크립트 없음.
 * ::backdrop 이 배경을 어둡게 덮고, @starting-style 이 작게·투명하게 시작해 커지며 나타난다.
 */
export default function LightboxGallery({
  photos = DEFAULT_PHOTOS,
  duration = 300,
  easing = "ease-out",
}: LightboxGalleryProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };
  return (
    <div className={styles.wrap} style={vars}>
      <ul className={styles.gallery} aria-label="Photo gallery">
        {photos.map((p) => (
          <li key={p.id}>
            <button className={styles.thumb} type="button" popoverTarget={p.id} aria-label="View enlarged photo">
              <img className={styles.thumbImg} src={p.src} alt="" />
            </button>
          </li>
        ))}
      </ul>
      {photos.map((p) => (
        <div key={p.id} className={styles.lightbox} id={p.id} popover="auto">
          <img className={styles.lightboxImg} src={p.full} alt="" />
          <button
            className={styles.close}
            type="button"
            popoverTarget={p.id}
            popoverTargetAction="hide"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
