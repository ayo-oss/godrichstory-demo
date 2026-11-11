import type { CSSProperties } from "react";
import styles from "./KineticCardGrid.module.scss";

export type KineticCardGridProps = {
  value?: number;
  label?: string;
  /** 0에서 목표까지 세는 시간(기본 2000ms) */
  duration?: number;
  easing?: string;
  color?: string;
};

type Vars = CSSProperties & { "--duration"?: string; "--easing"?: string; "--color"?: string; "--num-target"?: number };

export default function KineticCardGrid({
  value = 248,
  label = "Projects",
  duration = 2000,
  easing = "ease-out",
  color = "#fff7e6",
}: KineticCardGridProps) {
  const vars: Vars = { "--duration": `${duration}ms`, "--easing": easing, "--color": color, "--num-target": value };

  return (
    <div className={styles.stage} style={vars}>
      <div className={styles.card}>
        <span className={styles.num} aria-hidden="true" />
        <span className={styles.sr}>{value} {label.toLowerCase()}</span>
        <span className={styles.label}>{label}</span>
      </div>
    </div>
  );
}
