import type { CSSProperties } from "react";
import styles from "./PriceTagRibbon.module.scss";

export type PriceTagRibbonProps = {
  ribbon: string;
  price: string;
  /** 리본이 흔들리는 시간 (기본 300ms) */
  duration?: number;
  easing?: string;
  /** 사용 안 함(참고용) */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PriceTagRibbon({
  ribbon,
  price,
  duration = 300,
  easing = "ease-out",
  color = "#2f6df6",
}: PriceTagRibbonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.tag} style={vars} tabIndex={0}>
      <span className={styles.ribbon} aria-hidden="true">{ribbon}</span>
      <div className={styles.body}>
        <span className={styles.price}>{price}</span>
      </div>
    </div>
  );
}
