import type { CSSProperties } from "react";
import styles from "./BentoHero.module.scss";

export type BentoHeroProps = {
  eyebrow?: string;
  title?: string;
  cta?: string;
  stat?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoHero({
  eyebrow = "Nectar",
  title = "Your work and team, one screen",
  cta = "Start for free",
  stat = "Real-time sync",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BentoHeroProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <div className={`${styles.tile} ${styles.tileMain}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
      <div className={`${styles.tile} ${styles.tileStat}`}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.statLabel}>{stat}</span>
      </div>
      <div className={`${styles.tile} ${styles.tileVisual}`} aria-hidden="true" />
    </section>
  );
}
