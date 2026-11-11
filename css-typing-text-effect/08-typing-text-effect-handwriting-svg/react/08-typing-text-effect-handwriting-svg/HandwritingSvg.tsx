import type { CSSProperties } from "react";
import styles from "./HandwritingSvg.module.scss";

export type HandwritingSvgProps = {
  label: string;
  /** 획을 그리는 한 루프 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function HandwritingSvg({ label, duration = 2000, color = "#2f6df6" }: HandwritingSvgProps) {
  const vars = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <div className={styles.sig} style={vars}>
      <svg className={styles.svg} viewBox="0 0 240 80" fill="none" aria-hidden="true">
        <path d="M10 60 C 30 10, 50 70, 70 30 S 110 10, 130 50 S 170 70, 190 20 S 220 40, 230 30" />
      </svg>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
