import type { CSSProperties } from "react";
import styles from "./IconGlowRing.module.scss";

export type IconGlowRingProps = {
  /** 링 한 번 퍼지는 시간 (기본 2000ms) */
  duration?: number;
  color?: string;
};

export default function IconGlowRing({ duration = 2000, color = "#ffb020" }: IconGlowRingProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return (
    <span className={styles.wrap} style={vars} aria-hidden="true">
      <span className={`${styles.ring} ${styles.ringA}`} />
      <span className={`${styles.ring} ${styles.ringB}`} />
      <span className={styles.icon} />
    </span>
  );
}
