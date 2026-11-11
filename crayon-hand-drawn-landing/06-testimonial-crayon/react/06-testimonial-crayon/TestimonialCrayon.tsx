import type { CSSProperties } from "react";
import styles from "./TestimonialCrayon.module.scss";

export type TestimonialCrayonProps = {
  quote?: string;
  name?: string;
  stars?: number[];
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function TestimonialCrayon({
  quote = "우리 반 홈페이지 같아요",
  name = "김도담 · 미술학원 원장",
  stars = [100, 100, 100, 80, 40],
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff5a5f",
}: TestimonialCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <figure className={styles.figure} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="tc-rough" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency={0.05} numOctaves={2} seed={33} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={6} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span className={styles.avatar} aria-hidden="true" />
      <div className={styles.bubble}>
        <svg className={styles.frame} viewBox="0 0 260 110" preserveAspectRatio="none" aria-hidden="true">
          <path
            className={styles.framePath}
            d="M18 10 L242 10 C 250 10 252 18 252 26 L252 78 C 252 88 248 96 238 96 L48 96 L30 110 L34 94 L18 92 C 10 90 8 82 8 74 L8 26 C 8 16 10 10 18 10 Z"
          />
        </svg>
        <blockquote className={styles.quote}>{quote}</blockquote>
        <div className={styles.stars} aria-hidden="true">
          {stars.map((fill, i) => (
            <span key={i} className={styles.star} aria-hidden="true" style={{ "--fill": `${fill}%` } as CSSProperties}>★</span>
          ))}
        </div>
        <figcaption className={styles.caption}>{name}</figcaption>
      </div>
    </figure>
  );
}
