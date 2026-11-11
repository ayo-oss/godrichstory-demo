import type { CSSProperties } from "react";
import styles from "./SvgWave.module.scss";

export type SvgWaveProps = {
  /** 애니메이션 기준 시간(ms) */
  duration?: number;
  /** CSS easing */
  easing?: string;
  /** 피사체 색 */
  color?: string;
};

type Vars = CSSProperties & { "--i"?: number };

const COUNT = 4;

export default function SvgWave({
  duration = 6000,
  easing = "linear",
  color = "#fff7e6",
}: SvgWaveProps) {
  const vars = {
    "--duration": `${duration}ms`,
    "--easing": easing,
    "--color": color,
  } as CSSProperties;

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.layerBack}>
        <svg className={styles.wave} viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0,60 C60,90 120,30 180,60 C240,90 300,30 360,60 C420,90 480,30 480,60 L480,120 L0,120 Z" /></svg>
        <svg className={styles.wave} viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0,60 C60,90 120,30 180,60 C240,90 300,30 360,60 C420,90 480,30 480,60 L480,120 L0,120 Z" /></svg>
      </div>
      <div className={styles.layerFront}>
        <svg className={styles.wave} viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0,70 C50,40 130,100 180,70 C240,40 300,100 360,70 C420,40 480,100 480,70 L480,120 L0,120 Z" /></svg>
        <svg className={styles.wave} viewBox="0 0 480 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0,70 C50,40 130,100 180,70 C240,40 300,100 360,70 C420,40 480,100 480,70 L480,120 L0,120 Z" /></svg>
      </div>
    </div>
  );
}
