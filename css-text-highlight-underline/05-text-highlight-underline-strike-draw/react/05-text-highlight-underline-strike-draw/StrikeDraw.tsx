import type { CSSProperties } from "react";
import styles from "./StrikeDraw.module.scss";

export type StrikeDrawProps = {
  /** 취소선이 그어지는 이전 가격 */
  oldPrice: string;
  /** 강조되는 새 가격 */
  newPrice: string;
  /** 선이 그어지는 시간 (기본 500ms) */
  duration?: number;
  easing?: string;
  /** 취소선 색 */
  color?: string;
};

type Vars = CSSProperties & {
  "--duration"?: string;
  "--easing"?: string;
  "--color"?: string;
};

export default function StrikeDraw({
  oldPrice,
  newPrice,
  duration = 500,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#c2361a",
}: StrikeDrawProps) {
  const vars: Vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  };
  return (
    <p className={styles.price} style={vars}>
      <span className={styles.old}>
        {oldPrice}
        <span className={styles.strike} aria-hidden="true" />
      </span>
      <span className={styles.new}>{newPrice}</span>
    </p>
  );
}
