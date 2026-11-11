import type { CSSProperties } from "react";
import styles from "./TestimonialClay.module.scss";

export type TestimonialClayProps = {
  quote?: string;
  name?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialClay({
  quote = '"손끝에 감기는 느낌이에요"',
  name = "오하늘 · 프로덕트 디자이너",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#17141a",
}: TestimonialClayProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <div className={styles.testi} style={vars}>
      <span className={styles.avatar} aria-hidden="true" />
      <div className={styles.bubble}>
        <p className={styles.quote}>{quote}</p>
        <p className={styles.name}>{name}</p>
      </div>
    </div>
  );
}
