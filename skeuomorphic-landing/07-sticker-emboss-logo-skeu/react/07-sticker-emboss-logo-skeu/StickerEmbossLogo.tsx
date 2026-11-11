import type { CSSProperties } from "react";
import styles from "./StickerEmbossLogo.module.scss";

export type StickerEmbossLogoProps = {
  brand?: string;
  sub?: string;
  caption?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function StickerEmbossLogo({
  brand = "STUDIO",
  sub = "QUALITY PRESS",
  caption = "네 겹 그림자로 음각을 낸다",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#f4ead7",
}: StickerEmbossLogoProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.emboss} style={vars}>
      <div className={styles.shadow} aria-hidden="true" />
      <div className={styles.sticker}>
        <p className={styles.brand}>{brand}</p>
        <p className={styles.sub}>{sub}</p>
      </div>
      <p className={styles.caption}>{caption}</p>
    </section>
  );
}
