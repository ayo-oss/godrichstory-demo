import type { CSSProperties } from "react";
import styles from "./ShakePhoto.module.scss";

export type ShakePhotoProps = {
  caption: string;
  badge?: string;
  /** 흔들림이 끝나는 시간 (기본 220ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ShakePhoto({
  caption,
  badge = "SALE",
  duration = 220,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#fff7e6",
}: ShakePhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
        <span className={styles.badge}>{badge}</span>
      </span>
      <figcaption className={styles.cap}>{caption}</figcaption>
    </figure>
  );
}
