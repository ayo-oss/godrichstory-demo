import type { CSSProperties } from "react";
import styles from "./ZoomInPhoto.module.scss";

export type ZoomInPhotoProps = {
  caption: string;
  /** 확대가 끝나는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ZoomInPhoto({
  caption,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ZoomInPhotoProps) {
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
