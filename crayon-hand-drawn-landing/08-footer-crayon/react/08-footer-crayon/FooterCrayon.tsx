import type { CSSProperties } from "react";
import styles from "./FooterCrayon.module.scss";

export type FooterCrayonProps = {
  bottom?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function FooterCrayon({
  bottom = "크레용 · 오늘도 그림 한 장",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffcd3c",
}: FooterCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.wrap} style={vars}>
      <div className={styles.zigzag} aria-hidden="true" />
      <footer className={styles.panel}>
        <div className={`${styles.col} ${styles.colA}`}>
          <p className={styles.head}>클래스</p>
          <p className={styles.link}>수업</p>
          <p className={styles.link}>자료</p>
        </div>
        <div className={`${styles.col} ${styles.colB}`}>
          <p className={styles.head}>브랜드</p>
          <p className={styles.link}>소개</p>
          <p className={styles.link}>문의</p>
        </div>
        <div className={`${styles.col} ${styles.colC}`}>
          <p className={styles.head}>도움</p>
          <p className={styles.link}>자주 묻는 질문</p>
          <p className={styles.link}>가이드</p>
        </div>
        <p className={styles.bottom}>
          {bottom}
          <span className={`${styles.star} ${styles.starA}`} aria-hidden="true">✦</span>
          <span className={`${styles.star} ${styles.starB}`} aria-hidden="true">✦</span>
        </p>
      </footer>
    </div>
  );
}
