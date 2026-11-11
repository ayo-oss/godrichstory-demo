import type { CSSProperties } from "react";
import styles from "./CaptionSlidePhoto.module.scss";

export type CaptionSlidePhotoProps = {
  title: string;
  desc: string;
  /** 캡션이 올라오는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 캡션 배경 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CaptionSlidePhoto({
  title,
  desc,
  duration = 300,
  easing = "ease-out",
  color = "#fff7e6",
}: CaptionSlidePhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
      </span>
      <figcaption className={styles.cap}>
        <strong className={styles.title}>{title}</strong>
        <span className={styles.desc}>{desc}</span>
      </figcaption>
    </figure>
  );
}
