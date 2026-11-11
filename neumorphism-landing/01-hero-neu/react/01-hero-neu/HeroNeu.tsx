import type { CSSProperties } from "react";
import styles from "./HeroNeu.module.scss";

export type HeroNeuProps = {
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

export default function HeroNeu({
  eyebrow = "Neumo",
  title = "눌린 듯 떠 있는 화면",
  desc = "그림자 두 겹이 전부입니다",
  cta = "무료로 시작",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: HeroNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <span className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
      <span className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
