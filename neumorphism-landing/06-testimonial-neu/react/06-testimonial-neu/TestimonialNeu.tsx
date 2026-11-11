import type { CSSProperties } from "react";
import styles from "./TestimonialNeu.module.scss";

export type TestimonialNeuProps = {
  quote?: string;
  who?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialNeu({
  quote = '"손끝에 감기는 느낌이에요"',
  who = "오하늘 · 프로덕트 디자이너",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#2f6df6",
}: TestimonialNeuProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  return (
    <div className={styles.wrap} style={vars}>
      <span className={styles.avatar} aria-hidden="true" />
      <div className={styles.bubble}>
        <p className={styles.quote}>{quote}</p>
        <p className={styles.who}>{who}</p>
      </div>
    </div>
  );
}
