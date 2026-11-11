import type { CSSProperties } from "react";
import styles from "./TestimonialCandy.module.scss";

export type TestimonialCandyProps = {
  quote?: string;
  who?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialCandy({
  quote = "이 사이트 진짜 귀여워요",
  who = "김모찌 · 카페 운영",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ffb9cf",
}: TestimonialCandyProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.quotecandy} style={vars}>
      <span className={styles.avatar} aria-hidden="true" />
      <div className={styles.bubble}>
        <blockquote className={styles.text}>
          <p className={styles.line}>{quote}</p>
        </blockquote>
        <figcaption className={styles.who}>{who}</figcaption>
      </div>
    </figure>
  );
}
