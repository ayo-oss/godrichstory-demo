import { CSSProperties } from "react";
import styles from "./ExtendingArrow.module.scss";

export interface ExtendingArrowProps {
  duration?: string;
  easing?: string;
  color?: string;
}

// 실사용: :hover 만으로 동작한다. is-demo 강제 루프는 넣지 않는다 (블로그공장 react 컨벤션)
export default function ExtendingArrow({
  duration = "260ms",
  easing = "cubic-bezier(.34, 1.56, .64, 1)",
  color = "#fff7e6",
}: ExtendingArrowProps) {
  const style = { "--duration": duration, "--easing": easing, "--color": color } as CSSProperties;
  return (
    <a className={styles.link} href="#" style={style}>
      <span>Learn more</span>
      <span className={styles.arrow}>
        <span className={styles.shaft} />
        <span className={styles.head} />
        <span className={`${styles.trail} ${styles.trail1}`} aria-hidden="true" />
        <span className={`${styles.trail} ${styles.trail2}`} aria-hidden="true" />
      </span>
    </a>
  );
}
