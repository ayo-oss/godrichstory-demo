import type { CSSProperties } from "react";
import styles from "./HeroClay.module.scss";

export type HeroClayProps = {
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

export default function HeroClay({
  eyebrow = "Claymolt",
  title = "말랑한 시작",
  desc = "눌러도 돌아와요",
  cta = "무료로 시작",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: HeroClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <div className={`${styles.blob} ${styles.blobA}`} aria-hidden="true" />
      <div className={`${styles.blob} ${styles.blobB}`} aria-hidden="true" />
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
