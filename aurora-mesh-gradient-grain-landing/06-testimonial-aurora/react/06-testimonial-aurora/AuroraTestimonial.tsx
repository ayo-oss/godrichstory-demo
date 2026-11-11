import type { CSSProperties } from "react";
import styles from "./AuroraTestimonial.module.scss";

export type AuroraTestimonialProps = {
  quote?: string;
  name?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function AuroraTestimonial({
  quote = "Our launch got twice as fast thanks to this.",
  name = "Kim Do-hyun · Product Lead",
  duration = 2000,
  easing = "steps(4, jump-none)",
  color = "#ff4d1f",
}: AuroraTestimonialProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.wrap} style={vars}>
      <div className={`${styles.orb} ${styles.orb1}`} aria-hidden="true" />
      <div className={`${styles.orb} ${styles.orb2}`} aria-hidden="true" />
      <blockquote className={styles.card}>
        <p className={styles.quote}>&ldquo;{quote}&rdquo;</p>
        <figcaption className={styles.name}>{name}</figcaption>
      </blockquote>
    </figure>
  );
}
