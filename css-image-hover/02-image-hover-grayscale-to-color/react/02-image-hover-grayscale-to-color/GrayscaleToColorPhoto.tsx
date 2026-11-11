import type { CSSProperties } from "react";
import styles from "./GrayscaleToColorPhoto.module.scss";

export type GrayscaleToColorPhotoProps = {
  caption: string;
  /** 채도가 돌아오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function GrayscaleToColorPhoto({
  caption,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: GrayscaleToColorPhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
      </span>
      <figcaption className={styles.cap}>{caption}</figcaption>
    </figure>
  );
}
