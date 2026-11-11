import type { CSSProperties } from "react";
import styles from "./ClipCircleZoomPhoto.module.scss";

export type ClipCircleZoomPhotoProps = {
  caption: string;
  /** 원형 창이 다 커지는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ClipCircleZoomPhoto({
  caption,
  duration = 600,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: ClipCircleZoomPhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.base} aria-hidden="true" />
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
      </span>
      <figcaption className={styles.cap}>{caption}</figcaption>
    </figure>
  );
}
