import type { CSSProperties } from "react";
import styles from "./ImageCurtain.module.scss";

export type ImageCurtainProps = {
  /** 이미지 URL. 비우면 데모용 그라데이션을 쓴다 */
  src?: string;
  alt?: string;
  /** 커튼이 걷히는 시간 (기본 700ms) */
  duration?: number;
  /** 커튼 색 (기본 주황) */
  curtain?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--curtain"?: string };

export default function ImageCurtain({
  src,
  alt = "",
  duration = 700,
  curtain = "#ff4d1f",
  className = "",
}: ImageCurtainProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--curtain": curtain };

  return (
    <div className={`${styles.frame} ${className}`} style={vars}>
      {src ? (
        <img className={styles.image} src={src} alt={alt} />
      ) : (
        <div className={styles.image} aria-hidden="true" />
      )}
      <div className={styles.curtain} />
    </div>
  );
}
