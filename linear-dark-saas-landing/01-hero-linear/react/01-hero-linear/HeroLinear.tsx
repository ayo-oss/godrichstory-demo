import type { CSSProperties } from "react";
import styles from "./HeroLinear.module.scss";

export type HeroLinearProps = {
  eyebrow?: string;
  title?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroLinear({
  eyebrow = "Console",
  title = "From one screen to deploy",
  cta = "Start for free",
  duration = 2000,
  easing = "cubic-bezier(.2,1.4,.4,1)",
  color = "#2f6df6",
}: HeroLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.mock} style={vars}>
      <span className={styles.glow} aria-hidden="true" />
      <div className={styles.bar}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <div className={styles.body}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
