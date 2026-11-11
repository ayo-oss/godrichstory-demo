import type { CSSProperties } from "react";
import styles from "./TestimonialChrome.module.scss";

export type TestimonialChromeProps = {
  quote?: string;
  name?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialChrome({
  quote = "Our click-through rate doubled in launch week.",
  name = "Jieun Park · Marketing Lead",
  duration = 2000,
  easing = "linear",
  color = "#2f6df6",
}: TestimonialChromeProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.test} style={vars}>
      <div className={styles.avatar} aria-hidden="true">
        <div className={styles.avatarFill} />
      </div>
      <blockquote className={styles.card}>
        <p className={styles.quote}>&ldquo;{quote}&rdquo;</p>
        <figcaption className={styles.name}>{name}</figcaption>
      </blockquote>
    </figure>
  );
}
