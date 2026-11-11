import type { CSSProperties } from "react";
import styles from "./TestimonialHud.module.scss";

export type TestimonialHudProps = {
  verified?: string;
  quote?: string;
  author?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialHud({
  verified = "VERIFIED",
  quote = "놓치는 게 없어서 마음이 편해요",
  author = "이도윤 · 보안팀 매니저",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffd23f",
}: TestimonialHudProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.testimonial} style={vars}>
      <div className={styles.avatar} aria-hidden="true">
        <span className={styles.scanbox} />
      </div>
      <figure className={styles.card}>
        <span className={`${styles.corner} ${styles.cornerTl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerTr}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBl}`} aria-hidden="true" />
        <span className={`${styles.corner} ${styles.cornerBr}`} aria-hidden="true" />
        <span className={styles.verified}>{verified}</span>
        <blockquote className={styles.quote}>{quote}</blockquote>
        <figcaption className={styles.author}>{author}</figcaption>
      </figure>
    </div>
  );
}
