import type { CSSProperties } from "react";
import styles from "./PulseOrb.module.scss";

export type PulseOrbProps = {
  /** 오브 지름 (기본 68px) */
  size?: number;
  /** 펄스 한 사이클 시간 (기본 2000ms) */
  duration?: number;
  /** 구체 안쪽 색 */
  color?: string;
  label?: string;
};

type Vars = CSSProperties & { "--size"?: string; "--duration"?: string; "--color"?: string };

export default function PulseOrb({
  size = 68,
  duration = 2000,
  color = "#2f6df6",
  label = "Preparing a response",
}: PulseOrbProps) {
  const vars: Vars = {
    "--size": `${size}px`,
    "--duration": `${duration}ms`,
    "--color": color,
  };
  return <div className={styles.orb} style={vars} role="status" aria-label={label} />;
}
