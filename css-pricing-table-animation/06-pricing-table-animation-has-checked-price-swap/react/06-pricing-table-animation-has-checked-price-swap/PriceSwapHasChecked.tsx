import { CSSProperties } from "react";
import styles from "./PriceSwapHasChecked.module.scss";

export interface PriceSwapHasCheckedProps {
  duration?: string;
  easing?: string;
  monthly?: string;
  yearly?: string;
  name?: string;
}

// 실사용: 숨긴 라디오 상태를 :has() 로 카드 전체에서 읽는다. 자바스크립트 0.
export default function PriceSwapHasChecked({
  duration = "300ms",
  easing = "ease-out",
  monthly = "$29",
  yearly = "$19",
  name = "hc-period",
}: PriceSwapHasCheckedProps) {
  const style = { "--duration": duration, "--easing": easing } as CSSProperties;

  return (
    <div className={styles.card} style={style}>
      <div className={styles.toggle}>
        <input type="radio" name={name} id={`${name}-m`} className={styles.radioM} defaultChecked />
        <input type="radio" name={name} id={`${name}-y`} className={styles.radioY} />
        <label htmlFor={`${name}-m`}>Monthly</label>
        <label htmlFor={`${name}-y`}>Yearly</label>
      </div>
      <div className={styles.stack}>
        <div className={`${styles.price} ${styles.priceMonthly}`}>{monthly}<span>/mo</span></div>
        <div className={`${styles.price} ${styles.priceYearly}`}>{yearly}<span>/mo</span></div>
      </div>
    </div>
  );
}
