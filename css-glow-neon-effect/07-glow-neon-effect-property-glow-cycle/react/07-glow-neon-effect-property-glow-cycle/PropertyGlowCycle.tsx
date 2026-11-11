import type { CSSProperties } from "react";
import styles from "./PropertyGlowCycle.module.scss";

export type PropertyGlowCycleProps = {
  /** 색상 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  /** @property 미지원 브라우저용 대체 색 */
  color?: string;
};

export default function PropertyGlowCycle({ duration = 2000, color = "#8b5cf6" }: PropertyGlowCycleProps) {
  const vars: CSSProperties = { "--duration": `${duration}ms`, "--color": color } as CSSProperties;
  return <span className={styles.badge} style={vars} aria-hidden="true" />;
}
