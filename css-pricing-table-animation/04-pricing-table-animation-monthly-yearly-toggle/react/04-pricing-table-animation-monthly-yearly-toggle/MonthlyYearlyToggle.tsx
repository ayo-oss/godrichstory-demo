import { CSSProperties } from "react";
import styles from "./MonthlyYearlyToggle.module.scss";

export interface MonthlyYearlyToggleProps {
  duration?: string;
  easing?: string;
  color?: string;
  name?: string;
}

// 실사용: 숨긴 라디오 두 개 + 일반 형제 선택자. 자바스크립트로 상태를 들지 않는다.
export default function MonthlyYearlyToggle({
  duration = "300ms",
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#0a4fe8",
  name = "mt-period",
}: MonthlyYearlyToggleProps) {
  const monthlyId = `${name}-monthly`;
  const yearlyId = `${name}-yearly`;
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;

  return (
    <div className={styles.wrap} style={style}>
      <div className={styles.toggle}>
        <input type="radio" name={name} id={monthlyId} className={styles.radio} defaultChecked />
        <input type="radio" name={name} id={yearlyId} className={styles.radio} />
        <label className={styles.option} htmlFor={monthlyId}>Monthly</label>
        <label className={styles.option} htmlFor={yearlyId}>Yearly</label>
        <span className={styles.indicator} aria-hidden="true" />
      </div>
      <div className={styles.price}>$29<span className={styles.unit}>/mo</span></div>
    </div>
  );
}
