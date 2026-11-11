import type { CSSProperties } from "react";
import styles from "./BrightnessSweepPhoto.module.scss";

export type BrightnessSweepPhotoProps = {
  caption: string;
  /** 띠가 한 번 지나가는 시간 (기본 600ms) */
  duration?: number;
  easing?: string;
  /** 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BrightnessSweepPhoto({
  caption,
  duration = 600,
  easing = "ease-out",
  color = "#17141a",
}: BrightnessSweepPhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
        <span className={styles.sweep} />
      </span>
      <figcaption className={styles.cap}>{caption}</figcaption>
    </figure>
  );
}
