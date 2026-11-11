import type { CSSProperties } from "react";
import styles from "./CtaBandCrayon.module.scss";

export type CtaBandCrayonProps = {
  title?: string;
  desc?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function CtaBandCrayon({
  title = "지금 크레용처럼 칠해보세요",
  desc = "무료로 시작해보세요",
  cta = "시작하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#ff5a5f",
}: CtaBandCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <section className={styles.band} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="cb-rough" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency={0.06} numOctaves={2} seed={44} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.desc}>{desc}</p>
      <span className={styles.btnWrap}>
        <svg className={styles.btnFrame} viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true">
          <rect x={4} y={4} width={112} height={36} rx={18} className={styles.btnRect} />
        </svg>
        <button type="button" className={styles.btn}>{cta}</button>
      </span>
    </section>
  );
}
