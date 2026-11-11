import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./ImageBlurUp.module.scss";

export type ImageBlurUpProps = {
  /** 진짜 이미지 */
  src: string;
  /** 아주 작은(20px 안팎) 미리 준비한 흐린 이미지 */
  placeholderSrc: string;
  alt: string;
  /** 흐림 → 선명 전환 시간 (기본 400ms) */
  duration?: number;
  easing?: string;
  className?: string;
};

export default function ImageBlurUp({
  src,
  placeholderSrc,
  alt,
  duration = 400,
  easing = "cubic-bezier(.2,.8,.2,1)",
  className = "",
}: ImageBlurUpProps) {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);
  const vars = { "--duration": `${duration}ms`, "--easing": easing } as CSSProperties;

  return (
    <div className={`${styles.photo} ${className}`} style={vars}>
      <img className={styles.placeholder} src={placeholderSrc} alt="" aria-hidden="true" />
      <img
        className={`${styles.real} ${loaded ? styles.loaded : ""}`}
        src={src}
        alt={alt}
        onLoad={onLoad}
      />
    </div>
  );
}
