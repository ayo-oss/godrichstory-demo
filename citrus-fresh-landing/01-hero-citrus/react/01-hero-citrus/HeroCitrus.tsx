import type { CSSProperties } from "react";
import styles from "./HeroCitrus.module.scss";

export type HeroCitrusProps = {
  eyebrow?: string;
  title?: string;
  desc?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroCitrus({
  eyebrow = "스퀴즈",
  title = "오늘도 상큼하게",
  desc = "과즙 가득한 랜딩 키트",
  cta = "무료로 시작",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff6a00",
}: HeroCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.herocitrus} style={vars}>
      <span className={`${styles.drop} ${styles.dropA}`} aria-hidden="true" />
      <span className={`${styles.drop} ${styles.dropB}`} aria-hidden="true" />
      <span className={`${styles.drop} ${styles.dropC}`} aria-hidden="true" />
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
