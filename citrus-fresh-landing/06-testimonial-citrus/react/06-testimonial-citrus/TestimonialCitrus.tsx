import type { CSSProperties } from "react";
import styles from "./TestimonialCitrus.module.scss";

export type TestimonialCitrusProps = {
  quote?: string;
  who?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialCitrus({
  quote = "이 사이트 진짜 상큼해요",
  who = "박모찌 · 스무디 가게 운영",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff9a52",
}: TestimonialCitrusProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.quotecitrus} style={vars}>
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
