import type { CSSProperties } from "react";
import styles from "./ButtonsInputsCrayon.module.scss";

export type ButtonsInputsCrayonProps = {
  label?: string;
  placeholder?: string;
  cta?: string;
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string };

export default function ButtonsInputsCrayon({
  label = "이름",
  placeholder = "이름을 적어보세요",
  cta = "저장하기",
  duration = 2000,
  easing = "cubic-bezier(.2,.8,.2,1)",
  color = "#4fa3e3",
}: ButtonsInputsCrayonProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color };

  return (
    <form className={styles.form} style={vars}>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <filter id="bi-rough" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency={0.06} numOctaves={2} seed={51} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={5} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <label className={styles.field}>
        <span className={styles.label}>{label}</span>
        <span className={styles.inputWrap}>
          <svg className={styles.ring} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <rect x={3} y={3} width={94} height={34} rx={10} className={styles.ringRect} />
          </svg>
          <input className={styles.input} type="text" placeholder={placeholder} />
        </span>
      </label>
      <span className={styles.btnWrap}>
        <svg className={styles.btnFrame} viewBox="0 0 110 40" preserveAspectRatio="none" aria-hidden="true">
          <rect x={5} y={5} width={100} height={30} rx={15} className={`${styles.btnRect} ${styles.btnRectA}`} />
          <rect x={3} y={3} width={100} height={30} rx={15} className={`${styles.btnRect} ${styles.btnRectB}`} />
        </svg>
        <button type="button" className={styles.btn}>{cta}</button>
      </span>
    </form>
  );
}
