import type { CSSProperties } from "react";
import styles from "./BentoCtaBand.module.scss";

export type BentoCtaBandProps = {
  title?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoCtaBand({
  title = "Bring your team in today",
  cta = "Start for free",
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: BentoCtaBandProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.cta} style={vars}>
      <span className={styles.glow} aria-hidden="true" />
      <h3 className={styles.title}>{title}</h3>
      <button type="button" className={styles.btn}>{cta}</button>
    </section>
  );
}
