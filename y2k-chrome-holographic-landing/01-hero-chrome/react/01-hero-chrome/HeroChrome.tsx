import type { CSSProperties } from "react";
import styles from "./HeroChrome.module.scss";

export type HeroChromeProps = {
  eyebrow?: string;
  title?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroChrome({
  eyebrow = "CHROME",
  title = "The first screen, shining again",
  cta = "Start for free",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: HeroChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.title}>{title}</h2>
      <button type="button" className={styles.cta}>{cta}</button>
    </section>
  );
}
