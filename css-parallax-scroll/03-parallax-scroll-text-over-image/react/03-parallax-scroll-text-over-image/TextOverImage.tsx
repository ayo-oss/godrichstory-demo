import type { CSSProperties, ReactNode } from "react";
import styles from "./TextOverImage.module.scss";

export type TextOverImageProps = {
  children: ReactNode;
  /** 글자 이동량 (기본 70px, 이미지보다 훨씬 빠르게) */
  textShift?: number;
  /** 이미지 이동량 (기본 14px, 거의 고정) */
  imageShift?: number;
  /** 글자 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & {
  "--text-shift"?: string;
  "--image-shift"?: string;
  "--color"?: string;
};

export default function TextOverImage({
  children,
  textShift = 70,
  imageShift = 14,
  color = "#fff7e6",
  className = "",
}: TextOverImageProps) {
  const vars: Vars = {
    "--text-shift": `${textShift}px`,
    "--image-shift": `${imageShift}px`,
    "--color": color,
  };

  return (
    <div className={`${styles.wrap} ${className}`} style={vars}>
      <div className={styles.image} aria-hidden="true" />
      <h2 className={styles.text}>{children}</h2>
    </div>
  );
}
