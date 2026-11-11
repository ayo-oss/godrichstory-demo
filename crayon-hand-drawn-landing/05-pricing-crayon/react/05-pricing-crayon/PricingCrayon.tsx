import type { CSSProperties } from "react";
import styles from "./PricingCrayon.module.scss";

export type PricingCrayonProps = {
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PricingCrayon({
  duration = 2000,
  easing = "ease-out",
  color = "#ff5a5f",
}: PricingCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.wrap} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="pc-rough" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency={0.06} numOctaves={2} seed={21} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className={`${styles.card} ${styles.green}`}>
        <p className={styles.name}>새싹</p>
        <p className={styles.price}>무료</p>
        <p className={styles.note}>영원히</p>
      </div>
      <div className={`${styles.card} ${styles.main}`}>
        <span className={`${styles.star} ${styles.starA}`} aria-hidden="true">✦</span>
        <span className={`${styles.star} ${styles.starB}`} aria-hidden="true">✦</span>
        <p className={styles.name}>크레용</p>
        <span className={styles.priceWrap}>
          <svg className={styles.ring} viewBox="0 0 100 46" aria-hidden="true">
            <path className={styles.ringPath} d="M50 4 C 22 3, 5 14, 6 23 C 7 34, 26 42, 50 42 C 74 42, 93 34, 94 23 C 95 13, 78 3, 50 5" />
          </svg>
          <p className={styles.price}>월 12,000원</p>
        </span>
        <p className={styles.note}>가장 인기</p>
      </div>
      <div className={`${styles.card} ${styles.blue}`}>
        <p className={styles.name}>패밀리</p>
        <p className={styles.price}>월 9,000원</p>
        <p className={styles.note}>3인 이상</p>
      </div>
    </div>
  );
}
