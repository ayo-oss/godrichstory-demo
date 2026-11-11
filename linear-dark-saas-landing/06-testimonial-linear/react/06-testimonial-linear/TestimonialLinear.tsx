import type { CSSProperties } from "react";
import styles from "./TestimonialLinear.module.scss";

export type TestimonialLinearProps = {
  quote?: string;
  cite?: string;
  logoCount?: number;
  /** 로고 한 개가 밝아졌다 옅어지는 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialLinear({
  quote = "Our whole team switched over in a day, no onboarding docs needed.",
  cite = "Lee Ha-neul · Design Lead",
  logoCount = 4,
  duration = 2000,
  easing = "ease-out",
  color = "#2f6df6",
}: TestimonialLinearProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };
  const delays = Array.from({ length: logoCount }, (_, i) => `${-duration * (0.75 - i * 0.25)}ms`);

  return (
    <section className={styles.panel} style={vars}>
      <div className={styles.logos} aria-hidden="true">
        {delays.map((delay, i) => (
          <span key={i} className={styles.logo} style={{ animationDelay: i === 0 ? "0s" : delay }} />
        ))}
      </div>
      <blockquote className={styles.quote}>
        <p>“{quote}”</p>
        <cite>{cite}</cite>
      </blockquote>
    </section>
  );
}
