import type { CSSProperties } from "react";
import styles from "./AuroraHero.module.scss";

export type AuroraHeroProps = {
  eyebrow?: string;
  title?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraHero({
  eyebrow = "AURORA",
  title = "Manage subscribers from one screen",
  cta = "Start for free",
  duration = 2000,
  easing = "steps(4, jump-none)",
  color = "#2f6df6",
}: AuroraHeroProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <div className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orb3}`} aria-hidden="true" />
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <button type="button" className={styles.cta}>{cta}</button>
    </section>
  );
}
