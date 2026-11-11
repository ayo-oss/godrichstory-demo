import type { CSSProperties } from "react";
import styles from "./HeroCandy.module.scss";

export type HeroCandyProps = {
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

export default function HeroCandy({
  eyebrow = "푸딩",
  title = "말랑한 게 좋아",
  desc = "부드러운 파스텔 랜딩",
  cta = "무료로 시작",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: HeroCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.herocandy} style={vars}>
      <span className={`${styles.mist} ${styles.mistA}`} aria-hidden="true" />
      <span className={`${styles.mist} ${styles.mistB}`} aria-hidden="true" />
      <span className={`${styles.mist} ${styles.mistC}`} aria-hidden="true" />
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
