import type { CSSProperties } from "react";
import styles from "./PaperGrainCard.module.scss";

export type PaperGrainCardProps = {
  eyebrow?: string;
  title?: string;
  desc?: string;
  tag?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function PaperGrainCard({
  eyebrow = "기능 카드",
  title = "빠른 결제",
  desc = "결이 보이는 종이 카드",
  tag = "두 번째",
  duration = 2000,
  easing = "cubic-bezier(.2, .8, .2, 1)",
  color = "#fff7e6",
}: PaperGrainCardProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.paperstack} style={vars} aria-label="종이 결 카드 세 장">
      <article className={`${styles.sheet} ${styles.sheet3}`} aria-hidden="true">
        <span className={styles.line}></span><span className={styles.line}></span>
      </article>
      <article className={`${styles.sheet} ${styles.sheet2}`} aria-hidden="true">
        <span className={styles.tag}>{tag}</span>
        <span className={styles.line}></span>
      </article>
      <article className={`${styles.sheet} ${styles.sheet1}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.desc}>{desc}</p>
      </article>
    </section>
  );
}
