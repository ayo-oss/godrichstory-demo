import { CSSProperties } from "react";
import styles from "./SparkleButton.module.scss";

type Vars = CSSProperties & Record<string, string>;

export interface SparkleButtonProps {
  duration?: string;
  easing?: string;
  color?: string;
}

// 실사용: 진짜 :hover 중에만 반짝인다 (module.scss 의 .wrap:hover). props 는 변수 3개만 넘긴다
export default function SparkleButton({
  duration = "1.1s",
  easing = "ease-out",
  color = "#ffd23f",
}: SparkleButtonProps) {
  const style: Vars = { "--duration": duration, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={style}>
      <button className={styles.btn} type="button">
        프리미엄 업그레이드
      </button>
      <span className={`${styles.star} ${styles.star1}`}>✦</span>
      <span className={`${styles.star} ${styles.star2}`}>✦</span>
      <span className={`${styles.star} ${styles.star3}`}>✦</span>
      <span className={`${styles.star} ${styles.star4}`}>✦</span>
    </div>
  );
}
