import type { CSSProperties } from "react";
import styles from "./OverlayFadePhoto.module.scss";

export type OverlayFadePhotoProps = {
  overlayText: string;
  /** 오버레이가 덮이는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 오버레이 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function OverlayFadePhoto({
  overlayText,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: OverlayFadePhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.photo} style={vars} tabIndex={0}>
      <span className={styles.pic} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.hill} />
      </span>
      <span className={styles.overlay}>
        <span className={styles.overlayText}>{overlayText}</span>
      </span>
    </figure>
  );
}
