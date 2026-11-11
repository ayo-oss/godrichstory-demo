import type { CSSProperties, ReactNode } from "react";
import styles from "./NoiseGrainBg.module.scss";

export type NoiseGrainBgProps = {
  children?: ReactNode;
  /** 그레인 지글거림이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
  /** 그레인 점 색 */
  color?: string;
  className?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--color"?: string };

export default function NoiseGrainBg({
  children,
  duration = 2000,
  color = "#17141a",
  className = "",
}: NoiseGrainBgProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--color": color };
  return (
    <div className={`${styles.stage} ${className}`} style={vars}>
      <div className={styles.grain} aria-hidden="true" />
      {children}
    </div>
  );
}
