import type { CSSProperties } from "react";
import styles from "./ObjectFitGallery.module.scss";

export type Photo = { src: string; alt?: string };

export type ObjectFitGalleryProps = {
  photos?: Photo[];
  /** 프레임 확대 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 프레임 배경(로딩 중 틈) */
  color?: string;
};

// 예시 기본값 — 외부 요청 없이 렌더되도록 인라인 SVG를 썼다. 실제로는 photos prop 으로 진짜 사진 src 를 넘긴다
const swatch = (w: number, h: number, hex: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect width='${w}' height='${h}' fill='%23${hex}'/%3E%3C/svg%3E`;

const DEFAULT_PHOTOS: Photo[] = [
  { src: swatch(400, 300, "2f6df6") },
  { src: swatch(300, 420, "17141a") },
  { src: swatch(360, 360, "fff7e6") },
  { src: swatch(260, 420, "2f6df6") },
  { src: swatch(440, 280, "17141a") },
  { src: swatch(340, 340, "fff7e6") },
];

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

/** 세로·가로·정사각 사진이 섞여도 aspect-ratio + object-fit: cover 로 모든 칸을 같은 크기로 맞춘다 */
export default function ObjectFitGallery({
  photos = DEFAULT_PHOTOS,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: ObjectFitGalleryProps) {
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
