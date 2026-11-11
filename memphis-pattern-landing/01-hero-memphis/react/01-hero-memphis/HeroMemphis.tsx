import type { CSSProperties } from "react";
import styles from "./HeroMemphis.module.scss";

export type HeroMemphisProps = {
  eyebrow?: string;
  title?: string;
  desc?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  /** 반원 형상의 대표색 */
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroMemphis({
  eyebrow = "Memphis pattern",
  title = "패턴으로 꾸린 화면",
  desc = "점과 물결만으로 완성되는 랜딩",
  cta = "무료로 시작",
  duration = 2000,
  easing = "ease-out",
  color = "#ff5c47",
}: HeroMemphisProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.herom} style={vars}>
      <span className={`${styles.shape} ${styles.shapeHalf}`} aria-hidden="true" />
      <span className={`${styles.shape} ${styles.shapeTri}`} aria-hidden="true" />
      <span className={`${styles.shape} ${styles.shapeCross}`} aria-hidden="true" />
      <span className={`${styles.shape} ${styles.shapeZig}`} aria-hidden="true" />
      <div className={styles.panel}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button className={styles.cta} type="button">{cta}</button>
      </div>
    </section>
  );
}
