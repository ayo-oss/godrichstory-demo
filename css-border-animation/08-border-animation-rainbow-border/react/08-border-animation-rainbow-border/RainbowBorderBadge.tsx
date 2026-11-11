import type { CSSProperties } from "react";
import styles from "./RainbowBorderBadge.module.scss";

export type RainbowBorderBadgeProps = {
  label: string;
  /** 색이 한 바퀴 도는 시간 (기본 2000ms) */
  duration?: number;
};

type Vars = CSSProperties & { "--duration"?: string };

export default function RainbowBorderBadge({ label, duration = 2000 }: RainbowBorderBadgeProps) {
  const vars: Vars = { "--duration": `${duration}ms` };

  return <span className={styles.badge} style={vars}>{label}</span>;
}
