import type { CSSProperties } from "react";
import styles from "./FooterCitrus.module.scss";

export type FooterCitrusProps = {
  brand?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FooterCitrus({
  brand = "스퀴즈 · 상큼한 하루",
  duration = 2000,
  easing = "ease-out",
  color = "#ff6a00",
}: FooterCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <footer className={styles.footercitrus} style={vars}>
      <span className={styles.wave} aria-hidden="true" />
      <div className={styles.cols}>
        <div className={`${styles.col} ${styles.colOrg}`}>
          <p className={styles.head}>제품</p>
          <p className={styles.link}>기능</p>
        </div>
        <div className={`${styles.col} ${styles.colGrp}`}>
          <p className={styles.head}>회사</p>
          <p className={styles.link}>소개</p>
        </div>
        <div className={`${styles.col} ${styles.colLem}`}>
          <p className={styles.head}>도움말</p>
          <p className={styles.link}>가이드</p>
        </div>
      </div>
      <p className={styles.copy}>
        <span className={styles.spark} aria-hidden="true">✦</span>
        {brand}
        <span className={`${styles.spark} ${styles.sparkB}`} aria-hidden="true">✦</span>
      </p>
    </footer>
  );
}
