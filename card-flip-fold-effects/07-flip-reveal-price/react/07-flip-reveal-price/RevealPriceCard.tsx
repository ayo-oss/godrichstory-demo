import { CSSProperties } from "react";
import styles from "./RevealPriceCard.module.scss";

export interface RevealPriceCardProps {
  duration?: string;
  easing?: string;
  listPrice?: string;
  salePrice?: string;
  saleLabel?: string;
}

export default function RevealPriceCard({
  duration = "330ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  listPrice = "$49",
  salePrice = "$29",
  saleLabel = "Today only",
}: RevealPriceCardProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;
  return (
    <div className={styles.card} style={style}>
      <div className={styles.inner}>
        <div className={`${styles.face} ${styles.front}`}>
          <span className={styles.price}>{listPrice}</span>
          <span className={styles.label}>List price</span>
        </div>
        <div className={`${styles.face} ${styles.back}`}>
          <span className={styles.price}>{salePrice}</span>
          <span className={styles.label}>{saleLabel}</span>
        </div>
      </div>
    </div>
  );
}
