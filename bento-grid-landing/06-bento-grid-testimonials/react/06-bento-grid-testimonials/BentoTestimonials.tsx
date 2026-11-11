import type { CSSProperties } from "react";
import styles from "./BentoTestimonials.module.scss";

export type BentoTestimonialsProps = {
  quote?: string;
  by?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function BentoTestimonials({
  quote = "Onboarding time dropped by half for us.",
  by = "Kim Do-hyun · Product Manager",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: BentoTestimonialsProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.testi} style={vars}>
      <div className={`${styles.tile} ${styles.quote}`}>
        <p className={styles.text}>&ldquo;{quote}&rdquo;</p>
        <p className={styles.by}>{by}</p>
      </div>
      <div className={`${styles.tile} ${styles.avatar}`} aria-hidden="true" />
      <div className={`${styles.tile} ${styles.stars}`} aria-hidden="true">★★★★★</div>
    </section>
  );
}
