import type { CSSProperties } from "react";
import styles from "./HeroBrutalist.module.scss";

export type HeroBrutalistProps = {
  eyebrow?: string;
  title?: string;
  desc?: string;
  cta?: string;
  badge?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroBrutalist({
  eyebrow = "SLABKIT",
  title = "숨김 없는 시작",
  desc = "그림자까지 그대로 보여줄게요",
  cta = "지금 시작하기",
  badge = "NEW",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: HeroBrutalistProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <span className={styles.badge} aria-hidden="true">{badge}</span>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title} data-text={title}>{title}</h1>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
