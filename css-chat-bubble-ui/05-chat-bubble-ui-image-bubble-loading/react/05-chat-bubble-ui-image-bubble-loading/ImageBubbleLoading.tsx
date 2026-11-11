import type { CSSProperties } from "react";
import styles from "./ImageBubbleLoading.module.scss";

export type ImageBubbleLoadingProps = {
  /** 이미지 로드가 끝났는가 */
  loaded: boolean;
  duration?: number;
  easing?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string };

export default function ImageBubbleLoading({
  loaded,
  duration = 600,
  easing = "ease-out",
  className = "",
}: ImageBubbleLoadingProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing };

  return (
    <figure className={`${styles.bubble} ${className}`} style={vars}>
      <span className={`${styles.skeleton} ${loaded ? styles.fade : ""}`}>
        <span className={styles.shine} />
      </span>
      <span className={`${styles.photo} ${loaded ? styles.show : ""}`} />
    </figure>
  );
}
