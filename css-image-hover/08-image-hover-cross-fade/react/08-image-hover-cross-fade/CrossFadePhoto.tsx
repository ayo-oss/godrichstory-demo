import type { CSSProperties } from "react";
import styles from "./CrossFadePhoto.module.scss";

export type CrossFadePhotoProps = {
  caption: string;
  /** 두 번째 사진이 번지는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CrossFadePhoto({
  caption,
  duration = 300,
  easing = "ease-out",
  color = "#17141a",
}: CrossFadePhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.frame} aria-hidden="true">
        <span className={styles.a}>
          <span className={styles.sun} />
          <span className={styles.hill} />
        </span>
        <span className={styles.b}>
          <span className={`${styles.sun} ${styles.sunB}`} />
          <span className={`${styles.hill} ${styles.hillB}`} />
        </span>
      </span>
      <figcaption className={styles.cap}>{caption}</figcaption>
    </figure>
  );
}
