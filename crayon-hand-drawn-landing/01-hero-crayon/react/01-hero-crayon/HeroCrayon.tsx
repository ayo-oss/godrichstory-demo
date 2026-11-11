import type { CSSProperties } from "react";
import styles from "./HeroCrayon.module.scss";

export type HeroCrayonProps = {
  eyebrow?: string;
  title?: string;
  desc?: string;
  cta?: string;
  /** 한 주기(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function HeroCrayon({
  eyebrow = "CRAYON KIDS",
  title = "손으로 그린 것처럼",
  desc = "크레용 감성 랜딩 키트",
  cta = "무료 체험",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff5a5f",
}: HeroCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.hero} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="hc-rough" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency={0.045} numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={7} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <svg className={styles.frame} viewBox="0 0 300 190" preserveAspectRatio="none" aria-hidden="true">
        <rect x={6} y={6} width={288} height={178} rx={20} className={styles.frameRect} />
      </svg>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <svg className={styles.underline} viewBox="0 0 170 16" aria-hidden="true">
          <path className={styles.underlinePath} d="M4 9 C 28 3, 54 14, 84 7 S 136 3, 166 10" />
        </svg>
        <p className={styles.desc}>{desc}</p>
        <button type="button" className={styles.cta}>{cta}</button>
      </div>
    </section>
  );
}
