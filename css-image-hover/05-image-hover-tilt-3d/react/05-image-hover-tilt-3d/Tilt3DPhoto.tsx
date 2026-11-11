import type { CSSProperties } from "react";
import styles from "./Tilt3DPhoto.module.scss";

export type Tilt3DPhotoProps = {
  caption: string;
  /** 기울기가 붙는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 카드 프레임 색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function Tilt3DPhoto({
  caption,
  duration = 300,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#fff7e6",
}: Tilt3DPhotoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.frame}>
      <figure className={styles.photo} style={vars} tabIndex={0}>
        <span className={styles.pic} aria-hidden="true">
          <span className={styles.sun} />
          <span className={styles.hill} />
        </span>
        <figcaption className={styles.cap}>{caption}</figcaption>
      </figure>
    </div>
  );
}
